const express=require('express');
const router=express.Router();
const userController=require('../controllers/user/userController');
const Product=require('../models/productModel');
const userAuth=require('../middlewares/userAuth');
const userProfileController = require("../controllers/user/userProfileAddressController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController");
const walletController = require("../controllers/user/walletController");
const paginate = require('../middlewares/paginate');





// HOME PAGE ----------------------------------------------////////////////////
router.get('/',userAuth.generalPageCheckSession,userController.getHome)




///Login&Profile
router.get('/login',userAuth.isLoggedIn,userController.getLogin);
router.post('/login',userAuth.isLoggedIn,userController.postLogin);

////Logout 
router.post("/logout",userAuth.checkSession, userController.logout);

///sign-up
router.get('/sign-up',userAuth.isLoggedIn,userController.getSignUp);
router.post('/sign-up',userAuth.isLoggedIn,userController.signUpPost);
router.get('/verify-otp',userAuth.isLoggedIn, (req, res) => {
    res.render('user/user-signup-otp',{message:"OTP send to Email"})
  });
router.post('/resend-otp',userAuth.isLoggedIn,userController.resendOtp);
router.post('/verify-otp',userAuth.isLoggedIn,userController.verifyOtp);

//----------------------Forgot-Password--------------------------------------------
router.get('/forgot-password-email',userAuth.isLoggedIn,userController.getForgotPasswordEmail);
router.post('/forgot-password-email',userAuth.isLoggedIn,userController.postForgotPasswordEmail);
router.get('/forgot-password-otp',userAuth.isLoggedIn,userController.getForgotPasswordOtp);
router.post('/forgot-password-otp',userAuth.isLoggedIn,userController.postForgotPasswordOtp);
router.get('/forgot-password-password',userAuth.isLoggedIn,userController.getChangePassword);
router.post('/forgot-password-password',userAuth.isLoggedIn,userController.postChangePassword);

//--------------------Change Password-------------------------------------------------
router.get('/reset-password',userController.getResetPassword);
router.post('/reset-password',userController.postResetPassword);


//-----------------------SHOP ALL & PRODUCT DETAILS PAGE-------------------------------------------------------///
router.get('/shopAll',userAuth.generalPageCheckSession,paginate,userController.shopAll);
router.post('/filter',userAuth.generalPageCheckSession,paginate,userController.filterProducts)
router.get('/product/:id',userAuth.generalPageCheckSession,userController.getProduct);

//------------------------User Dashboard ---------------------------------------------------//////////////////////
//-------------------- Personal info Dashboard --------------------
router.get("/profile",userAuth.checkSession,userProfileController.getPersonalInformation);
router.post("/profile",userAuth.checkSession,userProfileController.updatePersonalInformation)


//-------------------- Address info Dashboard --------------------
// Add address
router.post("/address/add",userAuth.checkSession,userProfileController.addAddress);

// Get all addresses
router.get("/address/",userAuth.checkSession,userProfileController.getUserAddresses);

// Update an address
router.get("/address/edit/:id",userAuth.checkSession,userProfileController.getEditAddress);
router.post("/address/edit/:id",userAuth.checkSession,userProfileController.updateAddress);

// Delete an address
router.delete("/address/delete/:id",userAuth.checkSession,userProfileController.deleteAddress);

//--------------------Cart----------------------------------------- 


router.get("/cart", userAuth.checkSession, cartController.getCart);
router.post("/cart/add",userAuth.checkSession,cartController.addToCart);
router.delete("/cart/:id",userAuth.checkSession,cartController.deleteFromCart);
router.put("/cart/update",userAuth.checkSession,cartController.updateQuantity);


//--------------------Checkout------------------------------------------
router.get('/checkout',userAuth.checkSession,checkoutController.getCheckout)
router.post("/apply-coupon",userAuth.checkSession,checkoutController.applyCoupon);
router.post("/remove-coupon",userAuth.checkSession,checkoutController.removeCoupon);


//--------------------Orders----------------------------------------------
router.post('/place-order', userAuth.checkSession, checkoutController.placeOrder);
router.get('/order/confirmation/:orderId', userAuth.checkSession, orderController.getOrderConfirmation);

router.get('/orders',  userAuth.checkSession,paginate, orderController.getUserOrders);
router.get('/order/details/:orderId', userAuth.checkSession, orderController.getOrderDetails);
router.post('/order/cancel/:orderId/', userAuth.checkSession, orderController.cancelOrder); 
router.post('/order/cancel-item/:orderId/:itemId', userAuth.checkSession, orderController.cancelOrderItem); 
router.post('/order/return-request', userAuth.checkSession, orderController.requestReturn);
router.post('/order/verify-payment', userAuth.checkSession, orderController.verifyPayment);
router.post('/order/resume-payment/:orderId', userAuth.checkSession, orderController.continuePayment); 
router.post('/order/payment-failed', userAuth.checkSession, orderController.handlePaymentFailure);
router.get('/invoice',userAuth.checkSession,orderController.downloadInvoice) 

//-------------------------Wish List----------------------------------------------------------
router.get('/wishlist',  userAuth.checkSession, wishlistController.getWishlist);
router.get('/wishlist/data',userAuth.checkSession,paginate,wishlistController.getWishlistData);
//router.post('/wishlist/add',  userAuth.checkSession, wishlistController.addToWishlist);
router.post('/wishlist/remove',  userAuth.checkSession, wishlistController.removeFromWishlist);
router.post('/wishlist/toggle',  userAuth.checkSession, wishlistController.toggleWishlistItem);

//-----------------------------Wallet------------------------------------------------------------------
router.get('/wallet',userAuth.checkSession,paginate,walletController.getWallet)

module.exports=router;