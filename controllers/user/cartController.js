const Cart = require("../../models/cartModel");
const Product = require("../../models/productModel");
const Coupon=require("../../models/couponModel");
const Offer=require("../../models/offerModel");

exports.recalculateCart=async function (cart,req){
    //total purchase before applying coupon
    req.session.totalPurchaseAmount=0;
    for(const[index,item] of cart.items.entries()){
      const product = await Product.findOne({ _id: item.product._id, isBlocked: false })
          .populate({
              path: 'category',
              match: { status: 'Active' }
          });

      if (!product || !product.category) {
          console.error(`Product not found or inactive for id: ${item.product}`);
          throw new Error(`Product not found or inactive for id: ${item.product}`);
      }

      let appliedOfferType = null;
      let appliedOfferAmount = 0;
      let offerDetails = {};
      let finalPrice = product.price; // Start with the base price

      //  Evaluate offers (Product Offer vs Category Offer)
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

          offerDetails={
              type: appliedOfferType,
              description: maxOffer.description || 'Discount applied',
              discountPercentage: maxOffer.discountPercentage,
              discountAmount: maxDiscountAmount,
          };
      }
      
      // Update item details
      cart.items[index].price=product.price,
      cart.items[index].finalPrice=finalPrice,
      cart.items[index].originalTotalPrice = product.price * cart.items[index].quantity;
      cart.items[index].totalPriceAfterOffer = cart.items[index].finalPrice * cart.items[index].quantity;
      cart.items[index].appliedOfferType = appliedOfferType;
      cart.items[index].appliedOfferAmount = appliedOfferAmount;
      cart.items[index].offerDetails = offerDetails;

      //total purchase before applying coupon
      req.session.totalPurchaseAmount+=finalPrice*cart.items[index].quantity;

  };


 
if(cart.appliedCouponCode){
      let couponDiscount=0;
       const couponCode=cart.appliedCouponCode;
        const coupon=await Coupon.findOne({code:couponCode});   
         //let couponDiscount = 0;
      if (coupon.couponType === 'Percentage') {
        couponDiscount += (req.session.totalPurchaseAmount * coupon.couponValue) / 100;
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
}else{
    cart.couponDiscount=0;
    cart.couponDetails={};
    cart.appliedCouponCode=null;
};
  // Update cart totals
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.originalTotalPrice, 0);
  cart.totalDiscount = cart.items.reduce((sum, item) => sum + item.appliedOfferAmount, 0)+(cart.couponDiscount || 0);
  cart.grandTotal = cart.totalPrice - cart.totalDiscount;
};

exports.getCart=async function (req, res){
  try {
      if (!req.session.user || !req.session.user._id) {
        if(req.xhr){
            return res.json({ cartItems: [], totalPrice: 0, totalDiscount: 0,appliedCouponCode:null,user: req.session.user,couponDiscount:0,applicableCoupons:null, grandTotal: 0, });
        }else{
          return res.render('user/cart', { cartItems: [], totalPrice: 0, totalDiscount: 0,appliedCouponCode:null,user: req.session.user,couponDiscount:0,applicableCoupons:null, grandTotal: 0, });
        }
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
        if(req.xhr){
            return res.json({ cartItems: [], totalPrice: 0, totalDiscount: 0,appliedCouponCode:null,user: req.session.user,couponDiscount:0,applicableCoupons:null, grandTotal: 0, });
        }else{
          return res.render('user/cart', { cartItems: [], totalPrice: 0,totalDiscount: 0,appliedCouponCode:null,user: req.session.user,couponDiscount:0,applicableCoupons:null, grandTotal: 0, });
        }
            }
      
      // Recalculate totals and offers
      await exports.recalculateCart(cart,req);

/*       const cartItemCount = cart.items.length;
 */
     const now=new Date();
   const applicableCoupons=await Coupon.find({startDate:{$lte:now},expiryDate:{$gte:now},isActive:true});
      if (req.xhr) {
          return res.status(200).json({
              cartItems: cart.items,
              totalPrice: cart.totalPrice,
              totalDiscount:Math.round( cart.totalDiscount),
              grandTotal:Math.round( cart.grandTotal),
              applicableCoupons,
              user:req.session.user,
              couponDiscount:cart.couponDiscount,
              appliedCouponCode:cart.appliedCouponCode
          });
      }
      res.render('user/cart', {
          cartItems: cart.items,
          totalPrice: cart.totalPrice,
          totalDiscount: Math.round(cart.totalDiscount),
          grandTotal: Math.round(cart.grandTotal),
          message: null,
          applicableCoupons,
           user: req.session.user,
         couponDiscount:cart.couponDiscount,
         appliedCouponCode:cart.appliedCouponCode
      });
  } catch (err) {
      console.error('Error in getCart:', err);
      res.status(500).render('user/cart', { cart: [], totalPrice: 0, totalDiscount: 0, user: req.user, cartItemCount: 0, grandTotal: 0, message: 'An error occurred while fetching your cart.' });
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

          if (newQuantity > 5 ){
              return res.status(400).json({message: 'You cannot add more than 5 units of this product.' });
          }

          cart.items[itemIndex].quantity = newQuantity;
     
         }else{cart.items.push({
              product: productId,
              quantity,
              price: product.price,
              finalPrice: 0,
              total: 0,
              originalTotal: 0,
              appliedOfferType: null,
              appliedOfferAmount: 0,
              offerDetails: {},
          });
      }

      // Recalculate totals
      await exports.recalculateCart(cart,req);

      await cart.save();

      res.status(200).json({message: 'Product added to cart successfully!'});
  } catch (err) {
      console.error('Error in addToCart:', err);
      res.status(500).json({message: 'An error occurred while adding to cart.' });
  }
};


exports.deleteFromCart = async (req, res) => {
  try {
      const { cartItemId } = req.body;
      const userId = req.session.user?._id;

      if (!userId) {
          return res.status(401).json({message: 'User not logged in.' });
      }

      let cart = await Cart.findOne({ userId });
      if (!cart) {
          return res.status(400).json({ message: 'Cart not found.' });
      }
      if (cart.items.length === 1) {
        await Cart.findOneAndDelete({userId});
          return res.status(200).json({message: 'Product removed from cart.'});
      } else {
        let index = cart.items.findIndex((item)=>item._id.toString()===cartItemId);
        if (index !== -1) {
            cart.items.splice(index, 1);
        }
          // Recalculate totals
          await exports.recalculateCart(cart,req);
          if(cart.appliedCouponCode){
          const coupon = await Coupon.findOne({ code: cart.appliedCouponCode, isActive: true });
         //check if coupon is still active
          if (coupon.expiryDate && new Date() > coupon.expiryDate 
          || req.session.totalPurchaseAmount < coupon.minPurchaseAmount
        ||!coupon) {
              delete cart.appliedCouponCode;
            await exports.recalculateCart(cart,req);
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
      const { cartItemId, quantity } = req.body;
      const userId = req.session.user?._id;
      let cart = await Cart.findOne({ userId });
      if (!userId) {
          return res.status(401).json({message: 'User not logged in.'});
      }
      const productId=cart.items.find((item)=>item._id.toString()===cartItemId).product;
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
 
      const index = cart.items.findIndex(item => item.product.toString() === productId.toString());
      if(index>-1){
      cart.items[index].quantity=quantity;
          // Recalculate totals
          await exports.recalculateCart(cart,req);
          if(cart.appliedCouponCode){
            const coupon = await Coupon.findOne({ code: cart.appliedCouponCode, isActive: true });
                    //check if coupon is still active

            if (!coupon || coupon.expiryDate && new Date() > coupon.expiryDate 
            || req.session.totalPurchaseAmount < coupon.minPurchaseAmount
            ) {
                delete cart.appliedCouponCode;
                await exports.recalculateCart(cart,req);
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
      await exports.recalculateCart(cart,req);
      if(usage){
        usage.count++;
      }else{coupon.usageByUser.push({userId,count:1})}
      await cart.save();
      await coupon.save();
      res.status(200).json({
          message: "Coupon applied successfully",
          totalPrice:cart.totalPrice,
          grandTotal:cart.grandTotal,
          totalDiscount:cart.totalDiscount,
          couponDiscount: cart.couponDiscount
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
      await exports.recalculateCart(cart,req);
      coupon.usageByUser.find((usage)=>usage.userId.toString()===userId.toString()).count--;
      cart.save();
      coupon.save();
      res.json({
          message: "Coupon deleted successfully",
          totalPrice:cart.totalPrice,
          grandTotal:cart.grandTotal,
          totalDiscount:cart.totalDiscount,
          couponDiscount: cart.couponDiscount
      });
  } catch (error) {
      console.error("Apply coupon error: ", error);
      res.status(500).json({ message: "An error occurred while removing the coupon" });
  }

};


