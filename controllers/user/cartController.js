const mongoose = require("mongoose");
const Cart = require("../../models/cartModel");
const Product = require("../../models/productModel");
const Coupon=require("../../models/couponModel");

exports.recalculateCart = async (cart) => {
  for (let item of cart.items) {
      const product = await Product.findOne({ _id: item.product, isBlocked: false })
          .populate({
              path: 'category',
              match: { status: 'Active' }
          });

      if (!product || !product.category) {
          console.error(`Product not found or inactive for id: ${item.product}`);
          continue;
      }

      let appliedOfferType = null;
      let appliedOfferAmount = 0;
      let offerDetails = [];
      let finalPrice = product.price; // Start with the base price

      // 1. Apply product-specific discount (e.g., sale price, seasonal discount)
      if (product.discount) {
          const productDiscountAmount = (product.price * product.discount) / 100;
          finalPrice = (product.price*(100-product.discount)/100); // Adjust price after product discount
          offerDetails.push({
              type: 'Product Discount',
              description: `Base product discount of ${product.discount}%`,
              discountAmount: productDiscountAmount,
          });
      }

      // 2. Evaluate offers (Product Offer vs Category Offer)
      let productOffer = await Offer.findOne({
          applicableProduct: product._id,
          startDate: { $lte: new Date() },
          expiryDate: { $gte: new Date() },
          isActive: true,
      });

      let categoryOffer = await Offer.findOne({
          applicableCategory: product.category._id,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
          isActive: true,
      });

      if (productOffer || categoryOffer) {
          // Compare discount percentages and choose the highest
          const maxOffer = productOffer && categoryOffer
              ? (productOffer.discountPercentage >= categoryOffer.discountPercentage ? productOffer : categoryOffer)
              : productOffer || categoryOffer;

          const maxDiscountAmount = (finalPrice * maxOffer.discountPercentage) / 100; // Apply on adjusted price
          finalPrice = (finalPrice*(100-maxOffer.discountPercentage)/100); // Adjust final price with the best offer
          appliedOfferType = maxOffer.applicableProduct ? 'Product Offer' : 'Category Offer';
          appliedOfferAmount = maxDiscountAmount;

          offerDetails.push({
              type: appliedOfferType,
              description: maxOffer.description || 'Discount applied',
              discountPercentage: maxOffer.discountPercentage,
              discountAmount: maxDiscountAmount,
          });
      }
      
      // Update item details
      item.finalPrice = finalPrice;
      item.originalTotalPrice = product.price * item.quantity;
      item.totalPriceAfterDiscount = item.finalPrice * item.quantity;
      item.appliedOfferType = appliedOfferType;
      item.appliedOfferAmount = appliedOfferAmount;
      item.offerDetails = offerDetails;
      
  }

//total purchase before applying coupon
req.session.totalPurchaseAmount=cart.subTotal-cart.totalDiscount;

if(cart.appliedCoupon){
      let couponDiscount=0;
       const couponCode=req.session.appliedCoupon;
        const coupon=await Coupon.findOne({code:couponCode});   
         //let couponDiscount = 0;
      if (coupon.couponType === 'Percentage') {
        couponDiscount += (cartTotal * coupon.couponValue) / 100;
      } else {
        couponDiscount += coupon.couponValue;
      };

      //case if Adding coupon cause amount payable negative
      couponDiscount=req.session.totalPurchaseAmount>=couponDiscount?couponDiscount:req.session.totalPurchaseAmount;
      //update coupon details in cart
     cart.couponDiscount=couponDiscount;
     cart.couponDetails.couponCode=couponCode;
     cart.couponDetails.couponType=coupon.couponType;
     cart.couponDetails.couponValue=coupon.couponValue;
     // Update cart totals
   cart.subTotal = cart.items.reduce((sum, item) => sum + item.originalTotalPrice, 0);
   cart.totalDiscount = cart.items.reduce((sum, item) => sum + item.appliedOfferAmount, 0)+(cart.couponDiscount || 0);
   cart.grandTotal = cart.subTotal - cart.totalDiscount - (cart.couponDiscount || 0);
  
};
};

exports.getCart = async (req, res) => {
  try {
      if (!req.session.user || !req.session.user._id) {
          return res.status(401).render('user/cart', { cart: [], subTotal: 0, totalDiscount: 0, grandTotal: 0, user: req.user, cartItemCount: 0, message: 'Please log in to view your cart.' });
      }

      const userId = req.session.user._id;
      let cart = await Cart.findOne({ userId }).populate({
          path: 'items.product',
          match: { isBlocked: false },
          populate: {
              path: 'category',
              match: { status: 'Active' }
          }
      });

      if (!cart || cart.items.length === 0) {
          return res.render('user/cart', { cart: [], subTotal: 0, totalDiscount: 0, user: req.user, cartItemCount: 0, grandTotal: 0, message: 'Your cart is empty.' });
      }

      // Filter out items with inactive products or categories
      cart.items = cart.items.filter(item => item.product && item.product.category);

      // Recalculate totals and offers
      await this.recalculateCart(cart);

      const cartItemCount = cart.items.length;

      if (req.xhr) {
          return res.json({
              cart: cart.items,
              subTotal: cart.subTotal,
              totalDiscount:Math.round( cart.totalDiscount),
              grandTotal:Math.round( cart.grandTotal),
              cartItemCount
          });
      }

      res.render('user/cart', {
          cart: cart.items,
          subTotal: cart.subTotal,
          totalDiscount: Math.round(cart.totalDiscount),
          grandTotal: Math.round(cart.grandTotal),
          message: null,
          user: req.user,
          cartItemCount
      });
  } catch (err) {
      console.error('Error in getCart:', err);
      res.status(500).render('user/cart', { cart: [], subTotal: 0, totalDiscount: 0, user: req.user, cartItemCount: 0, grandTotal: 0, message: 'An error occurred while fetching your cart.' });
  }
};


exports.addToCart = async (req, res) => {
  try {
      const { productId, quantity } = req.body;
      const userId = req.session.user?._id;

      if (!userId) {
          return res.status(401).json({ message: 'User not logged in.' });
      }

      if (!productId || !quantity || quantity <= 0) {
          return res.status(400).json({ message: 'Invalid product or quantity.' });
      }

      const product = await Product.findOne({ _id: productId, isBlocked: false })
          .populate({
              path: 'category',
              match: { status: 'Active' }
          });

      if (!product || !product.category || product.stock < quantity) {
          return res.status(400).json({ message: 'Product not available or not active.' });
      }

      let cart = await Cart.findOne({ userId });
      if (!cart) {
          cart = new Cart({ userId, items: [] });
      }

      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
      if (itemIndex > -1) {
          const currentQuantity = cart.items[itemIndex].quantity;
          const newQuantity = currentQuantity + quantity;

          if (newQuantity > 4) {
              return res.status(400).json({message: 'You cannot add more than 4 units of this product.' });
          }

          cart.items[itemIndex].quantity = newQuantity;
      } else {
          if (quantity > 5) {
              return res.status(400).json({message: 'You cannot add more than 5 units of a product to your cart.' });
          }
          cart.items.push({
              product: productId,
              quantity,
              price: product.price,
              finalPrice: 0,
              total: 0,
              originalTotal: 0,
              appliedOfferType: null,
              appliedOfferAmount: 0,
              offerDetails: [],
          });
      }

      // Recalculate totals
      await this.recalculateCart(cart);

      await cart.save();

      res.status(200).json({message: 'Product added to cart successfully!'});
  } catch (err) {
      console.error('Error in addToCart:', err);
      res.status(500).json({message: 'An error occurred while adding to cart.' });
  }
};


exports.deleteFromCart = async (req, res) => {
  try {
      const { productId } = req.body;
      const userId = req.session.user?._id;

      if (!userId) {
          return res.status(401).json({message: 'User not logged in.' });
      }

      let cart = await Cart.findOne({ userId });
      if (!cart) {
          return res.status(400).json({ message: 'Cart not found.' });
      }

      cart.items = cart.items.filter(item => item.product.toString() !== productId);
      let cartItemCount = cart.items.length;
      
      if (cart.items.length === 0) {
          await Cart.findOneAndDelete({ userId });
          return res.status(200).json({message: 'Product removed from cart.'});
      } else {
          // Recalculate totals
          await this.recalculateCart(cart);
          if(cart.appliedCouponCode){
          const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
         //check if coupon is still active
          if (coupon.expiryDate && new Date() > coupon.expiryDate 
          || req.session.totalPurchaseAmount < coupon.minPurchaseAmount
        ||!coupon) {
              delete cart.appliedCouponCode;
            await this.recalculateCart(cart);
          }
        }
          await cart.save();
          return res.status(200).json({message: 'Product removed from cart.'});
      }
  } catch (err) {
      console.error('Error in removeFromCart:', err);
      res.status(500).json({message: 'An error occurred while removing from cart.' });
  }
};


exports.updateQuantity = async (req, res) => {
  try {
      const { productId, quantity } = req.body;
      const userId = req.session.user?._id;
      let cart = await Cart.findOne({ userId });
      let cartItemCount = cart.items.length;

      if (!userId) {
          return res.status(401).json({message: 'User not logged in.'});
      }

      if (!productId || quantity <= 0) {
          return res.status(400).json({message: 'Invalid product or quantity.'});
      }

      if (quantity > 5) {
          return res.status(400).json({message: 'You cannot have more than 5 units of a product in your cart.'});
      }

      const product = await Product.findOne({ _id: productId, isBlocked: false })
          .populate({
              path: 'category',
              match: { status: 'Active' }
          });

      if (!product || !product.category || product.stock < quantity) {
          return res.status(400).json({message: 'Product not available or not active.' });
      }

      if (!cart) {
          return res.status(400).json({message: 'Cart not found.'});
      }

      const item = cart.items.find(item => item.product.toString() === productId);
      if (item) {
          item.quantity = quantity;

          // Recalculate totals
          await this.recalculateCart(cart);
          if(cart.appliedCouponCode){
            const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
                    //check if coupon is still active

            if (coupon.expiryDate && new Date() > coupon.expiryDate 
            || req.session.totalPurchaseAmount < coupon.minPurchaseAmount
             || !coupon) {
                delete cart.appliedCouponCode;
                await this.recalculateCart(cart);
            }
        }
          await cart.save();
          res.status(200).json({message: 'Quantity updated successfully!' });
      } else {
          res.status(400).json({ message: 'Product not found in cart.'});
      }
  } catch (err) {
      console.error('Error in updateQuantity:', err);
      res.status(500).json({message: 'An error occurred while updating quantity.'});
  }
};

exports.applyCoupon = async (req, res) => {
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
      if (!coupon) {
          return res.status(404).json({ message: "Coupon not found or inactive" });
      }

      if (coupon.expiryDate && new Date() > coupon.expiryDate) {
          return res.status(400).json({ message: "Coupon has expired" });
      }
      if (req.session.totalPurchaseAmount < coupon.minPurchaseAmount) {
          return res.status(400).json({ message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required for this coupon` });
      }
      if(coupon.totalUsageLimit<=coupon.usageByUser.filter((usage)=>usage.userId===userId).count){
        return res.status(429).json({message:"total usage limit for this coupon exceeded"});
      }
      cart.appliedCouponCode=couponCode;
      this.recalculateCart(cart);
      coupon.usageByUser.find((usage)=>usage.userId===userId).count++;
      coupon.usageByUser.count++;
      await cart.save();
      await coupon.save();
      res.json({
          message: "Coupon applied successfully",
          subTotal:cart.subTotal,
          grandTotal:cart.grandTotal,
          totalDiscount:cart.totalDiscount,
          couponDiscount: couponDiscount
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
        return res.status(400).json({message:"No coupon is applied currently"});
      }
      delete cart.appliedCouponCode;
      coupon.usageByUser.count++;
      cart.save();
      coupon.save();
      res.json({
          message: "Coupon deleted successfully",
          subTotal:cart.subTotal,
          grandTotal:cart.grandTotal,
          totalDiscount:cart.totalDiscount,
          couponDiscount: couponDiscount
      });
  } catch (error) {
      console.error("Apply coupon error: ", error);
      res.status(500).json({ message: "An error occurred while applying the coupon" });
  }

};

