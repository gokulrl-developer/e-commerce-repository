const Order = require('../../models/orderModel');
const { format } = require('date-fns');

exports.getOrders = async function (req, res) {
    try {
        const { skip, limit, currentPage } = req.pagination;
        const [orders, totalOrders] = await Promise.all([
            Order.find().lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Order.countDocuments(),
        ]);
        const totalPages = Math.ceil(totalOrders / limit);

        if (!orders || orders.length === 0) {
            return res.render('admin/admin-error',{statusCode:404, message: "No orders is found" })
        };
        res.render("admin/admin-orders", { orders, currentPage, totalPages })
    } catch (error) {
        console.error("error on showing orders", error);
        return res.render('admin/admin-error',{statusCode:500, message: error.message || " Error on showing orders" });
    }
}

exports.getDetails = async function (req, res) {
    try {
        const orderId = req.params.id;
        const order = await Order.findOne({ _id: orderId }).populate('orderItems.product');;
        if (!order) {
            return res.status(404).json({ message: "Order not Found" });
        };
        formattedDate = format(order.orderDate, 'MMMM dd, yyyy');
        res.status(200).json({ order, formattedDate });
    } catch (error) {
        console.error("error on getting order details : ", error);
        return res.status(500).json({ message: error.message || "Error on showing order details" })
    }
}
exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { editedStatus } = req.body;
        const order = await Order.findByIdAndUpdate(orderId, { orderStatus: editedStatus }, { new: true });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: error.message || 'Failed to update order status' });
    }
};

 exports.handleReturnRequest = async (req, res) => {
    try {
        const { orderId, itemId, action } = req.body;
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in the order' });
        }

        if (item.status !== 'Return Requested') {
            return res.status(400).json({ success: false, message: 'Item is not pending return' });
        }

        if (action === 'approve') {
            item.status = 'Returned';

            // Restore product stock
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: item.quantity }
            });

            order.payment.totalAmount -= item.price * item.quantity;
            order.payment.grandTotal -= item.totalPrice;
            order.payment.discount = order.payment.totalAmount - order.payment.grandTotal;
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

            // Process refund to wallet
            await Wallet.findOneAndUpdate(
                { user: order.customer.customerId },
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
            return res.status(400).json({ success: false, message: 'Invalid action' });
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

        res.status(200).json({message: `Return request ${action}d successfully` });
    } catch (error) {
        console.error('Error handling return request:', error);
        res.status(500).json({ success: false, message: 'Failed to handle return request' });
    }
}; 