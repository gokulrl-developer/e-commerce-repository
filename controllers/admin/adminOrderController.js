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
