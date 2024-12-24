const Cart = require('../../models/cartModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const {recalculateCart} = require('./cartController');



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
                addresses,
                 message:"no items in the cart" });
        }    
    await recalculateCart(cart,req);
   if(cart.appliedCouponCode){
               const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
                       //check if coupon is still active
   
               if (coupon.expiryDate && new Date() > coupon.expiryDate 
               || req.session.totalPurchaseAmount < coupon.minPurchaseAmount
                || !coupon) {
                   delete cart.appliedCouponCode;
            await recalculateCart(cart,req);
               }
            };
            await cart.save();
    res.render("user/checkout", {
      totalPrice:cart.totalPrice,
      totalDiscount :cart.totalDiscount,
      grandTotal:cart.grandTotal,
      addresses,
      user:req.session.user,
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
                productId: product._id,
                productName: product.productName,
                quantity: item.quantity,
                price: product.price,
                discountedPrice: item.finalPrice,
                totalPrice:item.originalTotalPrice,
                status: 'Pending'
            };

        }));
         const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
         if (!coupon) {
             return res.status(404).json({ message: "Coupon not found or inactive" });
         }
   
         if (coupon.expiryDate && new Date() > coupon.expiryDate) {
             return res.status(400).json({ message: "Coupon has expired,Go to cart and remove the coupon" });
         };

        
        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet || wallet.balance < discountPrice) {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
        }

        if (paymentMethod === 'Cash On Delivery' && discountPrice > 1000) {
            return res.status(400).json({ message: "Cash On Delivery is not available for orders above Rs 1000" });
        }

        const order = new Orders({
            customer: {
                customerId: userId,
                customerName: user.name,
                customerEmail: user.email,
                shippingAddress

            },
            items: orderItems,
            payment: {
                paymentMethod,
                paymentStatus: paymentMethod === 'Cash On Delivery' ? 'Pending' : 'Completed',
                totalPrice:cart.totalPrice,
                discount:cart.totalDiscount,
                grandTotal:cart.grandTotal,
                couponDiscount:cart.couponDiscount,
                appliedCouponCode,
                    couponCode:cart.couponDetails.couponCode,
                    
            },
            coupon: appliedCoupon?.couponId
        });

        const savedOrder = await order.save();

        await Promise.all(orderItems.map(async (item) => {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }));
        await cart.deleteOne(); 

        delete req.session.totalPurchaseAmount;

        if (paymentMethod === 'Razorpay') {
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(discountPrice * 100),
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
                    $inc: { balance: -discountPrice },
                    $push: {
                        transactions: {
                            amount: discountPrice,
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
    