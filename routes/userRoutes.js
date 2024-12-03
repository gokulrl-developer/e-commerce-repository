const express=require('express');
const router=express.Router();
const userController=require('../controllers/user/userController');
const Product=require('../models/productModel');
const userAuth=require('../middlewares/userAuth');

///Home
router.get('/',userAuth.checkSession,userController.getHome);

///Login&Profile
router.get('/login',userAuth.isLoggedIn,userController.getLogin);
router.post('/login',userAuth.isLoggedIn,userController.postLogin);
router.get('/profile',userAuth.checkSession,userController.getProfile);

///sign-up
router.get('/sign-up',userAuth.isLoggedIn,userController.getSignUp);
router.post('/sign-up',userAuth.isLoggedIn,userController.signUpPost);
router.post('/resend-otp',userAuth.isLoggedIn,userController.resendOtp);

router.get('/shopAll',userAuth.checkSession,userController.shopAll)

router.get('/all-products',userAuth.checkSession,async(req,res)=>{
    const products=await Product.find({}).lean();
    products.forEach(product => {
        product.firstImageUrl = product.imageUrl[0];
    });   
    res.render('user/all-products',{user:true,products})
})
router.get('/product',userAuth.checkSession,async(req,res)=>{
    const product=await Product.findOne({}).lean();
    const products=await Product.find({}).lean();
    
    res.render('user/view-product',{user:true,product,products})
})

router.post('/verify-otp',userAuth.isLoggedIn,userController.verifyOtp);

module.exports=router;