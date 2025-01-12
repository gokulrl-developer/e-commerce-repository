const Cart = require('../../models/cartModel');
const Address = require('../../models/addressModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Coupon = require('../../models/couponModel');
const Order = require('../../models/orderModel');
const Wallet = require('../../models/walletModel');
const {recalculateCart} = require('./cartController');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
                totalPrice:0,
                totalDiscount:0,
                totalPriceAfterDiscount:0,
                couponDiscount:0,
                applicableCoupons:[],
                addresses,
                appliedCouponCode:null,
                 message:"no items in the cart" });
        }    
    await recalculateCart(cart,req);
   if(cart.appliedCouponCode){
               const coupon = await Coupon.findOne({ code: cart.appliedCouponCode, isActive: true });
                       //check if coupon is still active
   
               if (coupon.expiryDate && new Date() > coupon.expiryDate 
               || req.session.totalPurchaseAmount < coupon.minPurchaseAmount
                || !coupon) {
                   delete cart.appliedCouponCode;
            await recalculateCart(cart,req);
               }
            };
            await cart.save();
                 const now=new Date();
    const applicableCoupons=await Coupon.find({startDate:{$lte:now},expiryDate:{$gte:now},isActive:true});
    res.render("user/checkout", {
      totalPrice:cart.totalPrice,
      totalDiscount :cart.totalDiscount,
      grandTotal:cart.grandTotal,
      couponDiscount:cart.couponDiscount,
      applicableCoupons,
      addresses,
      appliedCouponCode:cart.appliedCouponCode,
      user:req.session.user,
    });
  } catch (error) {
    console.error("Error fetching cart items : ", error);
    res.status(500).json({message:error.message || "An error occured while loading the checkout page"});
  }
}; 


exports.placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.session.user?._id;
        if(!userId){
            return res.status(401).json({message:"User is not logged in"})
        }
        const user = await User.findById(userId);
        const shippingAddress = await Address.findById(addressId);
        if (!shippingAddress) {
            
            return res.status(404).json({ message: "Address not found" });
        }
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.product',
            match: { isBlocked: false },
            populate: {
                path: 'category',
                match: { status: 'Active' }
            }
        });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }
        
        

        const orderItems = (cart.items.map((item) => {
            const product = item.product;
            if(!product){
                throw new Error(`Some products in your cart is inactive`);
            }
            if(!product.category){
                throw new Error(`Some products in your cart belongs to inactive category`);
            }
            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.product_name}. Only ${product.stock} items left.`);
            }
            return {
                product: product._id,
                productName: product.productName,
                quantity: item.quantity,
                price: product.price,
                discountedPrice: item.finalPrice,
                totalPrice:item.originalTotalPrice,
                status: 'Pending'
            };

        }));
        if(cart.appliedCouponCode){
         const coupon = await Coupon.findOne({ code: cart.appliedCouponCode, isActive: true });
         if (!coupon) {
             return res.status(404).json({ message: "Coupon not found or inactive" });
         }
   
         if (coupon.expiryDate && new Date() > coupon.expiryDate) {
             return res.status(400).json({ message: "Coupon has expired,Go to cart and remove the coupon" });
         };
        };
        
        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet || wallet.balance < cart.grandTotal) {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
        }

        if (paymentMethod === 'Cash On Delivery' && (cart.grandTotal+100)*118/100 > 1000) {
            return res.status(400).json({ message: "Cash On Delivery is not available for orders above Rs 1000" });
        }
        const order = new Order({
            user: {
                userId,
                customerName: user.name,
                customerEmail: user.email,
                shippingAddress

            },
            orderItems,
            payment: {
                paymentMethod,
                paymentStatus: paymentMethod === 'Cash On Delivery' ? 'Pending' : 'Completed',
                totalAmount:cart.totalPrice,
                discount:cart.totalDiscount,
                grandTotal:cart.grandTotal +100,
                couponDiscount:cart.couponDiscount,
                appliedCouponCode:cart.appliedCouponCode,
                couponCode:cart.couponDetails.couponCode,
                shippingCost:100,
                orderTotal:(cart.grandTotal)*118/100,
                    
            },
            coupon: cart.appliedCouponCode?._Id
        });
        const savedOrder = await order.save();

        await Promise.all(orderItems.map(async (item) => {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }));
        await cart.deleteOne(); 

        delete req.session.totalPurchaseAmount;

        if (paymentMethod === 'Razorpay') {
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(order.payment.orderTotal * 100),
                currency: 'INR',
                receipt: savedOrder._id.toString()
            });

            savedOrder.payment.razorpayOrderId = razorpayOrder.id;
            savedOrder.payment.paymentStatus = 'Pending';
            await savedOrder.save();

            return res.status(200).json({ order: razorpayOrder });
        } 
        else if (paymentMethod === 'Wallet') {
            await Wallet.findOneAndUpdate(
                { user: userId },
                { 
                    $inc: { balance: -order.payment.grandTotal },
                    $push: {
                        transactions: {
                            amount: order.payment.orderTotal,
                            type: 'debit',
                            description: `Payment for order ${savedOrder._id}`,
                            orderId: savedOrder._id
                        }
                    }
                }
            );
        }

        res.status(201).json({ orderId: savedOrder._id });
    } catch (error) {
        console.error("Place order error: ", error);
        res.status(500).json({ message: error.message || 'Failed to place order' });
    }
}
 
exports.applyCoupon = async (req, res) => {
    try{
      const userId = req.session.user._id;
      const {couponCode}=req.body;
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.product',
            match: { isBlocked: false },
            populate: {
                path: 'category',
                match: { status: 'Active' }
            }
        });
  
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found or inactive" });
        }
  
        if (coupon.expiryDate && new Date() > coupon.expiryDate) {
            return res.status(400).json({ message: "Coupon has expired" });
        }
        if (req.session.totalPurchaseAmount < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required for this coupon` });
        }
        const usage=coupon.usageByUser.find((usage)=>usage.userId.toString()===userId.toString());
        if(usage && coupon.totalUsageLimit<=usage.count){
          return res.status(429).json({message:"total usage limit for this coupon exceeded"});
        }
        cart.appliedCouponCode=couponCode;
        await recalculateCart(cart,req);
        if(usage){
          usage.count++;
        }else{coupon.usageByUser.push({userId,count:1})}
        await cart.save();
        await coupon.save();
        const now=new Date();
    const applicableCoupons=await Coupon.find({startDate:{$lte:now},expiryDate:{$gte:now},isActive:true});
        res.status(200).json({
            message: "Coupon applied successfully",
            totalPrice:cart.totalPrice,
            grandTotal:cart.grandTotal,
            totalDiscount:cart.totalDiscount,
            couponDiscount: cart.couponDiscount,
            applicableCoupons,
            appliedCouponCode:cart.appliedCouponCode
        });
    } catch (error) {
        console.error("Apply coupon error: ", error);
        res.status(500).json({ message: "An error occurred while applying the coupon" });
    }
  
  };
  
  
  exports.removeCoupon = async (req, res) => {
    try{
      const userId = req.user._id;
      const {couponCode}=req.body;
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.product',
            match: { isBlocked: false },
            populate: {
                path: 'category',
                match: { status: 'Active' }
            }
        });
  
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
  
        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if(!coupon){
          return res.status(400).json({message:"The coupon is active currently to remove"});
        }
        cart.appliedCouponCode=null;
        await recalculateCart(cart,req);
        coupon.usageByUser.find((usage)=>usage.userId.toString()===userId.toString()).count--;
        cart.save();
        coupon.save();
        const now=new Date();
    const applicableCoupons=await Coupon.find({startDate:{$lte:now},expiryDate:{$gte:now},isActive:true});
        res.json({
            message: "Coupon deleted successfully",
            totalPrice:cart.totalPrice,
            grandTotal:cart.grandTotal,
            totalDiscount:cart.totalDiscount,
            couponDiscount: cart.couponDiscount,
            applicableCoupons,
            appliedCouponCode:cart.appliedCouponCode
        });
    } catch (error) {
        console.error("Apply coupon error: ", error);
        res.status(500).json({ message: "An error occurred while removing the coupon" });
    }
  
  };