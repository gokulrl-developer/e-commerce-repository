const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Wallet = require('../../models/walletModel');
const { format } = require('date-fns');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

exports.getOrders = async function (req, res) {
    try {
        const { skip, limit, currentPage } = req.pagination;
        let filterObj={};
      if(req.xhr){
        const {search} =req.query;
        const regex = new RegExp("^" + search, "i");
        filterObj={'orderItems.productName': { $regex: regex } }
      }else{
        filterObj={}
      }
        const [orders, totalOrders] = await Promise.all([
            Order.find(filterObj).lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Order.countDocuments(filterObj),
        ]);
        const totalPages = Math.ceil(totalOrders / limit);

        if (!orders || orders.length === 0) {
            if(req.xhr){
                return res.status(StatusCodes.OK).json({orders:[],currentPage:1,totalPages:1});
            }else{
            return res.render('admin/admin-error',{statusCode:404, message: Messages.ORDER_NOT_FOUND });
            }
        };
        if(req.xhr){
            return res.status(StatusCodes.OK).json({orders,currentPage,totalPages});
        }else{
         return res.render("admin/admin-orders", { orders, currentPage, totalPages });
        }
    } catch (error) {
        console.error("error on showing orders", error);
        return res.render('admin/admin-error',{statusCode:500, message: error.message || Messages.INTERNAL_SERVER_ERROR });
    }
}

exports.getDetails = async function (req, res) {
    try {
        const orderId = req.params.id;
        const order = await Order.findOne({ _id: orderId }).populate('orderItems.product');;
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({ message:Messages.ORDER_NOT_FOUND });
        };
        formattedDate = format(order.orderDate, 'MMMM dd, yyyy');
        res.status(StatusCodes.OK).json({ order, formattedDate });
    } catch (error) {
        console.error("error on getting order details : ", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message || Messages.INTERNAL_SERVER_ERROR })
    }
}
exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { editedStatus } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.ORDER_NOT_FOUND });
        }
        if (['Cancelled', 'Delivered'].includes(order.orderStatus)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.ORDER_IN_COMPLETED_STAGE });
        }

        order.orderStatus = editedStatus;
        if (editedStatus === 'Delivered') {
            order.payment.paymentStatus = 'Completed';
            order.orderItems.forEach(item => {
                if (item.status === 'Pending' || item.status === 'Processing' || item.status === 'Shipped') {
                    item.status = 'Delivered';
                }
            });
        } else if (editedStatus === 'Cancelled') {
            order.payment.paymentStatus = 'Failed';
            order.orderItems.forEach(item => {
                if (item.status === 'Pending' || item.status === 'Processing' || item.status === 'Shipped') {
                    item.status = 'Cancelled';
                }
            });
        }

        await order.save();

        res.status(StatusCodes.OK).json({ message: Messages.ORDER_STATUS_UPDATED });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message || Messages.INTERNAL_SERVER_ERROR });
    }
};

 exports.handleReturnRequest = async (req, res) => {
    try {
        const { orderId, itemId, action } = req.body;
        const order = await Order.findById(orderId).populate('orderItems.product');

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({message: Messages.ORDER_NOT_FOUND });
        }

        const item = order.orderItems.id(itemId);
        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json({message: Messages.ITEM_NOT_IN_ORDER });
        }

        if (item.status !== 'Return Requested') {
            return res.status(StatusCodes.BAD_REQUEST).json({message: Messages.NO_RETURN_REQUEST });
        }

        if (action === 'approve') {
            item.status = 'Returned';

            // Restore product stock
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity }
            });

           // Calculate refund amount
      let refundAmount = item.totalPrice;
      // If there's a coupon applied, calculate the proportional discount
      if (order.payment.appliedCouponCode) {
        const orderTotal = order.orderItems.reduce((sum, i) => sum + i.discountedPrice, 0);
          const itemTotal = item.quantity*item.discountedPrice;
          
          const discountProportion=(order.payment.couponDiscount/orderTotal*itemTotal);
          refundAmount = item.totalPrice - discountProportion;

          // Check if this is the last item being returned
          const activeItems = order.orderItems.filter(i => !['Cancelled', 'Returned'].includes(i.status));
          if (activeItems.length === 1 && activeItems[0]._id.toString() === itemId) {
              // This is the last item, include any remaining coupon discount
              const remainingCouponDiscount = order.payment.couponDiscount - discountProportion;
              refundAmount += remainingCouponDiscount;
          } 
      }
            // Process refund to wallet
            await Wallet.findOneAndUpdate(
                { user: order.user.userId },
                {
                    $inc: { balance: refundAmount },
                    $push: {
                        transactions: {
                            amount: refundAmount,
                            type: 'credit',
                            description: `Refund for returned item in order ${order._id}`,
                            orderId: order._id
                        }
                    }
                },
                { upsert: true }
            );

            //update refunded amount in order records

            
            order.payment.refundedAmount = (order.payment.refundedAmount || 0) + refundAmount;
            if (order.payment.totalAmount <= 0) {
                order.payment.paymentStatus = 'Refunded';
            } else {
                order.payment.paymentStatus = 'Partially Refunded';
            }
        } else if (action === 'reject') {
            item.status = 'Return Rejected';
        } else {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.INVALID_ACTION });
        }

        item.returnProcessedDate = new Date();

        // Update order status
        const activeItems = order.orderItems.filter(i => !['Cancelled', 'Returned'].includes(i.status));
        if (activeItems.length === 0) {
            order.orderStatus = 'Cancelled';
        } else if (order.orderItems.every(i => ['Delivered', 'Cancelled', 'Returned', 'Return Rejected'].includes(i.status))) {
            order.orderStatus = 'Delivered';
        }

        await order.save();

        res.status(StatusCodes.OK).json({message: Messages.RETURN_REQUEST_SUCCESS(action) });
    } catch (error) {
        console.error('Error handling return request:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
}; 