const express=require('express');
const router=express.Router();
const userController=require('../controllers/user/userController');
const Product=require('../models/productModel');
router.get('/user/login',(req,res)=>{
    res.render('user/user-login',{user:true});
})
router.get('/',userController.getHome);

router.get('/login',userController.getLogin);
router.post('/login',userController.postLogin);



router.get('/sign-up',userController.getSignUp);

router.post('/sign-up',userController.signUpPost);
router.post('/resend-otp',userController.resendOtp);

router.get('/shopAll',userController.shopAll)

router.get('/all-products',async(req,res)=>{
    const products=await Product.find({}).lean();
    products.forEach(product => {
        product.firstImageUrl = product.imageUrl[0];
    });   
    res.render('user/all-products',{user:true,products})
})
router.get('/product',async(req,res)=>{
    const product=await Product.findOne({}).lean();
    const productImageUrls=[];
    product.imageUrl.forEach((url,i)=>{
        productImageUrls.push({url,index:i});
    })
    product.firstImageUrl = product.imageUrl[0];
    res.render('user/view-product',{user:true,product,productImageUrls})
})
//router.get('/user/verify-Otp',userController.verifyOtp)

router.post('/verify-otp',userController.verifyOtp)
router.get('/signup-otp',(req,res)=>{
    res.render('user/user-signup-otp')
})

module.exports=router;