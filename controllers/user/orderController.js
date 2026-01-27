const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Wallet = require('../../models/walletModel');
const { format } = require('date-fns');
const crypto =require('crypto');
const Razorpay = require('razorpay');
const PDFDocument = require('pdfkit'); 
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.continuePayment = async (req, res) => {
  try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
      }

      if (order.payment.paymentStatus !== 'Failed' && order.payment.paymentStatus !== 'Pending') {
          return res.status(StatusCodes.BAD_REQUEST).json({ message: Messages.CONFIRMATION_NOT_REQUIRED });
      }
     
      const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(order.payment.orderTotal* 100),
          currency: 'INR',
          receipt: order._id.toString()
      });

      order.payment.razorpayOrderId = razorpayOrder.id;
      order.payment.paymentStatus = 'Pending';
      await order.save();

      res.json({
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
      });
  } catch (error) {
      console.error('Error continuing payment:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
      const { orderId, paymentId, signature } = req.body;
      const order = await Order.findOne({ 'payment.razorpayOrderId': orderId });

      if (!order) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
      }

      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest("hex");

      if (expectedSignature === signature) {
          order.payment.paymentStatus = 'Completed';
          order.payment.razorpayPaymentId = paymentId;
          await order.save();
          res.status(StatusCodes.OK).json({ message: Messages.PAYMENT_VERIFIED, orderId: order._id });
      } else {
          order.payment.paymentStatus = 'Failed';
          await order.save();
          res.status(StatusCodes.BAD_REQUEST).json({message: Messages.PAYMENT_VERIFICATION_FAIL });
      }
  } catch (error) {
      console.error("Payment verification error: ", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: error.message || Messages.INTERNAL_SERVER_ERROR });
  }
};

exports.handlePaymentFailure = async (req, res) => {
  try {
      const { orderId } = req.body;
      const order = await Order.findOne({ 'payment.razorpayOrderId': orderId });

      if (!order) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
      }

      order.payment.paymentStatus = 'Failed';
      await order.save();

      res.status(StatusCodes.OK).json({ message: Messages.PAYMENT_FAILURE_RECORDED, orderId: order._id });
  } catch (error) {
      console.error('Error handling payment failure:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};

exports.cancelOrderItem = async (req, res) => {
  try {
      const { orderId, itemId } = req.params;
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
      }

      if (order.user.userId.toString() !== req.user._id.toString()) {
          return res.status(StatusCodes.FORBIDDEN).json({ message: Messages.UNAUTHORIZED_ACCESS });
      }

      const item = order.orderItems.id(itemId);
      if (!item) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ITEM_NOT_IN_ORDER });
      }

      if (item.status !== 'Pending' && item.status !== 'Processing') {
          return res.status(StatusCodes.BAD_REQUEST).json({ message: Messages.UNCANCELLABLE_STATUS });
      }

      item.status = 'Cancelled';


      // Restore product stock
      await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
      });
      // Calculate refund amount
      let refundAmount = item.discountedPrice*item.quantity;

      // If there's a coupon applied, calculate the proportional discount
      if (order.payment.appliedCouponCode) {
        const orderTotal = order.orderItems.reduce((sum, i) => sum + (i.discountedPrice * i.quantity), 0);
          const itemTotal = item.quantity*item.discountedPrice;
          const discountProportion=((order.payment.couponDiscount/orderTotal)*itemTotal);
          refundAmount = item.totalPrice - discountProportion;
          const activeItems = order.orderItems.filter(i => !['Cancelled', 'Returned'].includes(i.status));

          if (activeItems.length === 1 && activeItems[0]._id.toString() === itemId) {
              // This is the last item, include any remaining coupon discount
              const remainingCouponDiscount = order.payment.couponDiscount - discountProportion;
              refundAmount += remainingCouponDiscount;
          }
      }

      // Process refund
      if (order.payment.paymentStatus === 'Completed') {
          await Wallet.findOneAndUpdate(
              { user: order.user.userId },
              { 
                  $inc: { balance: refundAmount },
                  $push: { 
                      transactions: {
                          amount:refundAmount,
                          type:'credit',
                          description:`Refund for cancelled item in order with order:id ${'#'+order._id.toString().slice(-6)}`,
                          orderId:order._id
                      }
                  }
              },
              { upsert: true }
          );
      }

      // Update order status
      const allCancelled = order.orderItems.every(item => item.status === 'Cancelled' || item.status ==='Returned');
      if(order.payment.paymentStatus !== 'Failed'){
      if (allCancelled) {
          order.orderStatus = 'Cancelled';
          order.payment.paymentStatus = 'Refunded';
      } else {
          order.orderStatus = 'Partially Cancelled';
          if (order.payment.paymentStatus === 'Completed') {
              order.payment.paymentStatus = 'Partially Refunded';
          }
      }
    }
    
      order.payment.refundedAmount = (order.payment.refundedAmount || 0) + refundAmount;
      await order.save();

      res.status(StatusCodes.OK).json({ message: Messages.ITEM_CANCELLED, order });
  } catch (error) {
      console.error('Error cancelling order item:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};

exports.getOrderConfirmation = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      
      const order = await Order.findById(orderId).populate('orderItems.product');
      
      if (!order) {
        return res.status(StatusCodes.NOT_FOUND).render('error', { message: Messages.ORDER_NOT_FOUND });
      }
      order.formattedDate = format(order.orderDate, 'MMMM dd, yyyy');
      res.render('user/order-confirmation', { order });
    } catch (error) {
      console.error('Error fetching order confirmation:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', { message: Messages.INTERNAL_SERVER_ERROR });
    }
  };
   
  
  
  exports.getUserOrders = async (req, res) => {
        const{currentPage,skip,limit}= req.pagination;
    try {
      const userId = req.session.user?._id;
      if(!userId){
        return res.status(StatusCodes.UNAUTHORIZED).render('error', { message:Messages.USER_NOT_LOGGED });
      }
      let filterObj={};
      if(req.xhr){
        const {search} =req.query;
        const regex = new RegExp("^" + search, "i");
        filterObj={'user.userId':userId,'orderItems.productName': { $regex: regex } }
      }else{
        filterObj={'user.userId':userId}
      }
      const orders = await Order.find(filterObj).sort({ orderDate: -1 }).skip(skip).limit(limit).populate('orderItems.product');
      const totalOrders = await Order.find(filterObj).countDocuments();
      const totalPages=Math.ceil(totalOrders/limit);
      const formattedOrders = orders.map(order => ({
        ...order.toObject(),
        formattedDate: format(order.orderDate, 'MMMM dd, yyyy'),
        totalItems: order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
      }));
      if(req.xhr){
        res.status(StatusCodes.OK).json({orders:formattedOrders,user:req.user,currentPage,totalPages});
        console.log(formattedOrders)
      }else{
      res.render('user/user-orders', { orders: formattedOrders,user:req.session.user,currentPage,totalPages});
      console.log("aksdfl")
      }
    } catch (error) {
      console.error('Error fetching user orders:', error);
      res.render('user-error', { statusCode:500,message: Messages.INTERNAL_SERVER_ERROR });
    }
  };
   
  
 exports.getOrderDetails = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId).populate('orderItems.product');
      if (!order) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: Messages.UNAUTHORIZED_ACCESS });
      }
      formattedDate = format(order.orderDate, 'MMMM dd, yyyy');

      res.json({ order ,formattedDate});
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
  };
   
  
exports.cancelOrder = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
      }
      const userId=req.session.user?._id;
      if (!userId || order.user.userId.toString() !== userId.toString()) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: Messages.UNAUTHORIZED_ACCESS });
      }
  
      if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Processing' && order.orderStatus !== 'Partially Cancelled') {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: Messages.UNCANCELLABLE_STATUS });
      }
  
      
      // Calculate refund amount
      let refundAmount = order.payment.orderTotal;
      
      // Process refund
      if (order.payment.paymentStatus === 'Completed') {
        await Wallet.findOneAndUpdate(
          { user: order.user.userId },
          { 
            $inc: { balance: refundAmount },
            $push: { 
              transactions: {
                amount:refundAmount,
                type:'credit',
                description:`Refund for cancelled order with order:id ${'#'+order._id.toString().slice(-6)}`,
                orderId:order._id
              }
            }
          },
          { upsert: true }
        );
      }
      // Restore product stock
      for (let item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }


      order.orderStatus = 'Cancelled';
      order.orderItems.forEach((item)=>item.status='Cancelled');
      if(order.payment.paymentStatus!=='Failed'){
      order.payment.paymentStatus = 'Refunded';
      }

      await order.save();
  
      res.status(StatusCodes.OK).json({ message: Messages.ORDER_CANCELLED });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
  };
 

  exports.requestReturn = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
        }

        if (order.user.userId.toString() !== req.user._id.toString()) {
            return res.status(StatusCodes.FORBIDDEN).json({ message: Messages.UNAUTHORIZED_ACCESS });
        }

        const item = order.orderItems.id(itemId);
        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ITEM_NOT_IN_ORDER });
        }
        if (item.status !== 'Delivered') {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: Messages.NOT_DELIVERED });
        }

        item.status = 'Return Requested';
        item.returnReason = reason;
        item.returnRequestDate = new Date();

        await order.save();
       
        res.json({ message: Messages.RETURN_REQUEST_SUBMITTED});
    } catch (error) {
        console.error('Error requesting return:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
};

exports.downloadInvoice =async (req,res) =>{
 try{
    const user=req.user;
    const {orderId}=req.query;
    const order =await Order.findOne({"user.userId":user._id,_id:orderId}).populate("orderItems.product");
    if(!order){
      return res.status(StatusCodes.NOT_FOUND).json({message:Messages.ORDER_NOT_FOUND});
    }
    function buildPDF(dataCallback,endCallback){
      const doc =new PDFDocument();
      doc.on('data',dataCallback);
      doc.on('end',endCallback);
      doc .fontSize(15) .text(`Final Details of Order #${order._id}`,{
        align:'center'
      });
      doc.moveDown();
      doc.moveTo(60, doc.y).lineTo(550, doc.y).stroke();
       doc.moveDown(.25);
      doc .fontSize(13) .text('Items Ordered',{
        align:'left',
        continued:true
      });
      doc .fontSize(13) .text('Price',{
        align:'right'
      });
      for(let i=0;i<order.orderItems.length;i++){
        doc.moveDown();
        doc .fontSize(11) .text(`${order.orderItems[i].quantity} of ${order.orderItems[i].productName}|${order.orderItems[i].product.brand}`,{
          align:'left',
          continued:true
        });
        doc .fontSize(11) .text(`₹${order.orderItems[i].discountedPrice*order.orderItems[i].quantity}`,{
          align:'right'
        });
        doc .fontSize(10).text(`status : ${order.orderItems[i].status}`,{
          align:'left'
        });
      }
      doc.moveTo(60, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(.25);
      doc .fontSize(13).text('Customer Details',{
        align:'center'
      });
      doc .fontSize(11).text(`Customer Name : ${order.user.customerName}`,{
        align:'left'
      });
      doc .fontSize(11).text(`Customer Email : ${order.user.customerEmail}`,{
        align:'left'
      });
      doc .fontSize(11).text(`Shipping Address : ${order.user.shippingAddress.Name},${order.user.shippingAddress.HouseName},${order.user.shippingAddress.LocalityStreet},${order.user.shippingAddress.TownCity},${order.user.shippingAddress.state},${order.user.shippingAddress.country},`,{
        align:'left'
      });
      doc .fontSize(11).text(`Pin : ${order.user.shippingAddress.pincode}`,{
        align:'left'
      });
      doc .fontSize(11).text(`Contact : ${order.user.shippingAddress.MobileNumber}`,{
        align:'left'
      });
      doc.moveTo(60, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(.25);
      doc .fontSize(13).text('Payment Details',{
        align:'center'
      });
      doc .fontSize(11).text('Payment Status',{
        align:'left',
        continued:true
      });
      doc .fontSize(11).text(`${order.payment.paymentStatus}`,{
        align:'right'
      });
      doc .fontSize(11).text('Payment Method',{
        align:'left',
        continued:true
      });
      doc .fontSize(11).text(`${order.payment.paymentMethod}`,{
        align:'right'
      });
      doc .fontSize(11).text('Subtotal',{
        align:'left',
        continued:true
      });
      doc .fontSize(11).text(`${order.payment.totalAmount-order.payment.discount}`,{
        align:'right'
      });
      if(order.payment.appliedCouponCode){
      doc .fontSize(11).text('Coupon Discount',{
        align:'left',
        continued:true
      });
      doc .fontSize(11).text(`${order.payment.couponDiscount}`,{
        align:'right'
      });
    };
    doc .fontSize(12).text('Shipping Cost',{
      align:'left',
      continued:true
    });
    doc .fontSize(12).text(`${order.payment.shippingCost}`,{
      align:'right'
    });
      doc .fontSize(12).text('Grand Total',{
        align:'left',
        continued:true
      });
      doc .fontSize(12).text(`${order.payment.grandTotal}`,{
        align:'right'
      });
      doc .fontSize(12).text('Order Total (Incl.GST)',{
        align:'left',
        continued:true
      });
      doc .fontSize(12).text(`${order.payment.orderTotal}`,{
        align:'right'
      });
      doc.moveTo(60, doc.y).lineTo(550, doc.y).stroke();
       doc.rect(60,60,490,doc.y-60).stroke();
      doc.end();
    };

    res.writeHead(200,{
      'Content-Type':'application/pdf',
      'Content-Disposition':'attachment;filename=invoice.pdf'
    });
    buildPDF(
      (chunk)=>res.write(chunk),
      ()=>res.end()
    );
 }catch(error){
  if(!res.headersSent){
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR});
  }else{
  console.log(error.message)
  }
 }
};