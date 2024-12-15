const Cart = require('../../models/cartModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');

exports.getCheckout = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        if(!userId){
            return res.status(401).json({message:"User not Logged In"})
        }
        const addresses = await Address.find({ userId });
        let cart = await Cart.findOne({ userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.render("user/checkout", { 
                subtotal,
                totalDiscount,
                totalPriceAfterDiscount,
                addresses,
                 message:"no items in the cart" });
        }    
    let subtotal = 0;
    let totalDiscount = 0;

    cart.items.forEach((item) => {
      const product = item.product;
      subtotal += product.price * item.quantity;
      totalDiscount += (product.price-product.discountPrice) * item.quantity;

    });
    const totalPriceAfterDiscount = subtotal - totalDiscount;
  
    res.render("user/checkout", {
      subtotal,
      totalDiscount,
      totalPriceAfterDiscount,
      addresses
    });
  } catch (error) {
    console.error("Error fetching cart items : ", error);
    res.status(500).json({message:error.message || "An error occured while loading the checkout page"});
  }
}; 


exports.placeOrder = async (req, res) => {
    try {
        const { selectedAddress, paymentMethod } = req.body;
        const addressId=selectedAddress;
        const userId = req.session.user?._id;
        if(!userId){
            return res.status(401).json({message:"User is not logged in"})
        }
        const user = await User.findById(userId);
        const shippingAddress = await Address.findById(addressId);
        if (!shippingAddress) {
            
            return res.status(404).json({ message: "Address not found" });
        }

        const cart = await Cart.findOne({ userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }
        const items = cart.items.filter(item => item.product && !item.product.isBlocked);
        let subTotalPrice = 0;
        let totalFinalPrice = 0; 
        const orderItems = await Promise.all(items.map(async (item) => {
            const product = item.product;
  
            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.productName}. Only ${product.stock} items left.`);
            }
  
            subTotalPrice += product.price*item.quantity;
            totalFinalPrice += product.discountPrice*item.quantity;
  
            return {
                product: product._id,
                productName: product.productName,
                quantity: item.quantity,
                price: product.price,
                discount: product.discount,
            };
        }));
        const order = new Order({
            user: {
                userId: userId,
                customerName: user.name,
                customerEmail:user.email,
                shippingAddress
               
            },
            orderItems: orderItems,
            payment: {
                paymentMethod,
                paymentStatus: 'Pending',
                subTotalPrice,
                totalFinalPrice,
            },
        });

        const savedOrder = await order.save();
        await Promise.all(orderItems.map(async (item) => {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }));
  
        
        await cart.deleteOne(); 
  
        res.status(201).json({message:"Order placed successfully", orderId: savedOrder._id });
    } catch (error) {
        console.error("Place order error: ", error);
        res.status(500).json({ message: error.message || 'Failed to place order' });
    }
  };