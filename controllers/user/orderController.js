const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const { format } = require('date-fns');

  
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
  
      res.render('user/user-orders', { orders: formattedOrders});
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