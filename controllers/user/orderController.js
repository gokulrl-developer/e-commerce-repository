const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Wallet = require('../../models/walletModel');
const { format } = require('date-fns');
const crypto =require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.continuePayment = async (req, res) => {
  try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }

      if (order.payment.paymentStatus !== 'Failed' && order.payment.paymentStatus !== 'Pending') {
          return res.status(400).json({ message: 'This order does not require payment continuation' });
      }
     
      const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(order.payment.grandTotal* 100),
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
      res.status(500).json({ message: 'Failed to continue payment' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
      const { orderId, paymentId, signature } = req.body;
      const order = await Order.findOne({ 'payment.razorpayOrderId': orderId });

      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
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
          res.status(200).json({ message: 'Payment verified successfully', orderId: order._id });
      } else {
          order.payment.paymentStatus = 'Failed';
          await order.save();
          res.status(400).json({message: 'Payment verification failed' });
      }
  } catch (error) {
      console.error("Payment verification error: ", error);
      res.status(500).json({message: error.message || 'Payment verification failed' });
  }
};

exports.handlePaymentFailure = async (req, res) => {
  try {
      const { orderId } = req.body;
      const order = await Order.findOne({ 'payment.razorpayOrderId': orderId });

      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }

      order.payment.paymentStatus = 'Failed';
      await order.save();

      res.status(200).json({ message: 'Payment failure recorded successfully', orderId: order._id });
  } catch (error) {
      console.error('Error handling payment failure:', error);
      res.status(500).json({ message: 'Failed to handle payment failure' });
  }
};

exports.cancelOrderItem = async (req, res) => {
  try {
      const { orderId, itemId } = req.params;
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }

      if (order.customer.customerId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Unauthorized access' });
      }

      const item = order.orderItems.id(itemId);
      if (!item) {
          return res.status(404).json({ message: 'Item not found in the order' });
      }

      if (item.status !== 'Pending' && item.status !== 'Processing') {
          return res.status(400).json({ message: 'This item cannot be cancelled' });
      }

      item.status = 'Cancelled';

      order.payment.totalAmount -= item.price * item.quantity;
      order.payment.grandTotal -= item.totalPrice;
      order.payment.discount = order.payment.totalAmount - order.payment.grandTotal;
      // Restore product stock
      await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
      });

      // Calculate refund amount
      let refundAmount = item.totalPrice;

      // If there's a coupon applied, calculate the proportional discount
      if (order.payment.appliedCouponCode) {
        const orderTotal = order.items.reduce((sum, i) => sum + i.discountedPrice, 0);
          const itemTotal = item.quantity*item.discountedPrice;
          const discountProportion=(order.couponDiscount/orderTotal*itemTotal);
          refundAmount = item.totalPrice - discountProportion;

          // Check if this is the last item being returned
          const activeItems = order.items.filter(i => !['Cancelled', 'Returned'].includes(i.status));
          if (activeItems.length === 1 && activeItems[0]._id.toString() === itemId) {
              // This is the last item, include any remaining coupon discount
              const remainingCouponDiscount = order.payment.couponDiscount - discountProportion;
              refundAmount -= remainingCouponDiscount;
          }
      }

      // Process refund
      if (order.payment.paymentMethod !== 'Cash On Delivery' && order.payment.paymentStatus === 'Completed') {
          await Wallet.findOneAndUpdate(
              { user: order.user.userId },
              { 
                  $inc: { balance: refundAmount },
                  $push: { 
                      transactions: {
                          amount: refundAmount,
                          type: 'credit',
                          description: `Refund for cancelled item in order ${order._id}`,
                          orderId: order._id
                      }
                  }
              },
              { upsert: true }
          );
      }

      // Update order status
      const allCancelled = order.items.every(item => item.status === 'Cancelled');
      if (allCancelled) {
          order.orderStatus = 'Cancelled';
          order.payment.paymentStatus = 'Refunded';
      } else {
          order.orderStatus = 'Partially Cancelled';
          if (order.payment.paymentStatus === 'Completed') {
              order.payment.paymentStatus = 'Partially Refunded';
          }
      }
      order.payment.refundedAmount = (order.payment.refundedAmount || 0) + refundAmount;
      await order.save();

      res.status(200).json({ message: 'Item cancelled successfully', order });
  } catch (error) {
      console.error('Error cancelling order item:', error);
      res.status(500).json({ message: 'Failed to cancel order item' });
  }
};

exports.getOrderConfirmation = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      
      const order = await Order.findById(orderId).populate('orderItems.product');
      
      if (!order) {
        return res.status(404).render('error', { message: 'Order not found' });
      }
      order.formattedDate = format(order.orderDate, 'MMMM dd, yyyy');
      res.render('user/order-confirmation', { order });
    } catch (error) {
      console.error('Error fetching order confirmation:', error);
      res.status(500).render('error', { message: 'Failed to fetch order confirmation' });
    }
  };
   
  
  
  exports.getUserOrders = async (req, res) => {
    try {
      const userId = req.session.user?._id;
      if(!userId){
        return res.status(401).render('error', { message:"User not logged in." });
      }
      const orders = await Order.find({ 'user.userId': userId }).sort({ orderDate: -1 }).populate('orderItems.product');
      const formattedOrders = orders.map(order => ({
        ...order.toObject(),
        formattedDate: format(order.orderDate, 'MMMM dd, yyyy'),
        totalItems: order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
      }));
  
      res.render('user/user-orders', { orders: formattedOrders,user:req.session.user});
    } catch (error) {
      console.error('Error fetching user orders:', error);
      res.status(500).render('error', { message: 'Failed to fetch orders' });
    }
  };
   
  
 exports.getOrderDetails = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId).populate('orderItems.product');
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }
      formatedDate = format(order.orderDate, 'MMMM dd, yyyy');

      res.json({ order ,formatedDate});
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({ message: 'Failed to fetch order details' });
    }
  };
   
  
   exports.cancelOrder = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      const userId=req.session.user?._id;
      if (!userId || order.user.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }
  
      if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Processing') {
        return res.status(400).json({ message: 'This order cannot be cancelled' });
      }
  
      order.orderStatus = 'Cancelled';
      await order.save();
  
      // Restore product stock
      for (let item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
  
      res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Failed to cancel order' });
    }
  };

  exports.requestReturn = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        const item = order.orderItems.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found in the order' });
        }
        if (item.status !== 'Delivered') {
            return res.status(400).json({ message: 'Only delivered items can be returned' });
        }

        item.status = 'Return Requested';
        item.returnReason = reason;
        item.returnRequestDate = new Date();

        await order.save();
       
        res.json({ message: 'Return request submitted successfully'});
    } catch (error) {
        console.error('Error requesting return:', error);
        res.status(500).json({ message: 'Failed to submit return request' });
    }
};