const Cart = require("../../models/cartModel");
const Product = require("../../models/productModel");
const Coupon=require("../../models/couponModel");
const Offer=require("../../models/offerModel");

exports.recalculateCart=async function (cart,req){
    //total purchase before applying coupon
    req.session.totalPurchaseAmount=0;

    let products=[];
    let productOffers=[];
    let categoryOffers=[];

    products=await Promise.all(cart.items.map(async(item)=>{
       return await Product.findOne({_id: item.product, isBlocked: false})
        .populate({
            path: 'category',
            match: { status: 'Active' }
        });
     }));
     products=products.filter((product)=>product);
    console.log(products)
    productOffers=await Promise.all(products.map(async(product)=>{
        console.log(product._id)
        return await Offer.findOne({
            applicableProduct:product._id,
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() },
            isActive: true,
        });
     }));
     categoryOffers=await Promise.all(products.map(async(product)=>{
        
        return await Offer.findOne({
            applicableCategory: product.category._id,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
            isActive: true,
        });
     }))
    for(const[index,item] of cart.items.entries()){
        if(!item.product){
            cart.items.splice(index,1);
            continue;
        }
          const product=products.find((product)=>{
           return product?._id.toString()===(item.product._id).toString()
          })
      if (!product || !product.category || product.isBlocked===true) {
          console.error(`Product not found or inactive for id: ${item.product}`);
          continue;
          /* throw new Error(`Product not found or inactive for id: ${item.product}`); */
      }

      let appliedOfferType = null;
      let appliedOfferAmount = 0;
      let offerDetails = {};
      let finalPrice = product.price; // Start with the base price

      let productOffer =productOffers.find((offer)=>{
        if(offer?.applicableProduct){
       return offer.applicableProduct.toString()===(product._id||product).toString();
        }
      })
      let categoryOffer =categoryOffers.find((offer)=>{
        if(offer?.applicableCategory){
       return offer.applicableCategory.toString()===product.category._id.toString();
        }
      })
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
};
  // Update cart totals
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.originalTotalPrice, 0);
  cart.totalDiscount = cart.items.reduce((sum, item) => sum + item.appliedOfferAmount, 0)+(cart.couponDiscount || 0);
  cart.grandTotal = cart.totalPrice - cart.totalDiscount;
}

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
    await cart.save();
    if (!cart || cart.items.length === 0) {
        if(req.xhr){
            return res.json({ cartItems: [], totalPrice: 0, totalDiscount: 0,appliedCouponCode:null,user: req.session.user,couponDiscount:0,applicableCoupons:null, grandTotal: 0, });
        }else{
          return res.render('user/cart', { cartItems: [], totalPrice: 0,totalDiscount: 0,appliedCouponCode:null,user: req.session.user,couponDiscount:0,applicableCoupons:null, grandTotal: 0, });
        }
            }
/*       const cartItemCount = cart.items.length;
 */                    const now=new Date();
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
      console.log(err.message)
      res.status(500).render('user/cart', { cartItems: [],appliedCouponCode:null,couponDiscount:0,totalPrice: 0, totalDiscount: 0, user: req.user, cartItemCount: 0, grandTotal: 0, message: 'An error occurred while fetching your cart.' });
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
      const cartItemId  = req.params.id;
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
        let index = cart.items.findIndex((item)=>item._id.toString()===cartItemId.toString());
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



