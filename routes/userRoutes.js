const express=require('express');
const router=express.Router();
const userController=require('../controllers/user/userController');
const Product=require('../models/productModel');
const userAuth=require('../middlewares/userAuth');
const userProfileController = require("../controllers/user/userProfileAddressController");
const cartController = require("../controllers/user/cartController");





// GENERAL USERS
router.get('/home',userController.getHome)



///Home
router.get('/',userAuth.checkSession,userController.getHome);

///Login&Profile
router.get('/login',userAuth.isLoggedIn,userController.getLogin);
router.post('/login',userAuth.isLoggedIn,userController.postLogin);

////Logout 
router.post("/logout", userController.logout);

///sign-up
router.get('/sign-up',userAuth.isLoggedIn,userController.getSignUp);
router.post('/sign-up',userAuth.isLoggedIn,userController.signUpPost);
router.get('/verify-otp', (req, res) => {
    res.render('user/user-signup-otp',{message:"OTP send to Email"})
  });
router.post('/resend-otp',userAuth.isLoggedIn,userController.resendOtp);
router.post('/verify-otp',userAuth.isLoggedIn,userController.verifyOtp);


router.get('/shopAll',userAuth.checkSession,userController.shopAll)

router.get('/product/:id',userAuth.checkSession,userController.getProduct);

//User Dashboard 
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
router.put("/cart/:id",userAuth.checkSession,cartController.updateCartQuantity);




module.exports=router;