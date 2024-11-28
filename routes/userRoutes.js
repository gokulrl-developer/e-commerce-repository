const express=require('express');
const router=express.Router();
const userController=require('../controllers/user/userController');
router.get('/',(req,res)=>{
    let products=[{productname:'bag1',price:500,img:"https://images.meesho.com/images/products/440647803/oft3v_512.webp"},
        {productname:'bag1',price:500,img:"https://images.meesho.com/images/products/440647803/oft3v_512.webp"},
        {productname:'bag1',price:500,img:"https://images.meesho.com/images/products/440647803/oft3v_512.webp"},
        {productname:'bag1',price:500,img:"https://images.meesho.com/images/products/440647803/oft3v_512.webp"}
        
    ]
    res.render('index',{user:true,products});
})
router.get('/user/login',(req,res)=>{
    res.render('user/user-login',{user:true});
})
router.get('/sign-up',userController.getSignUp);

router.post('/sign-up',userController.signUpPost);
router.post('/resend-otp',userController.resendOtp);

router.get('/user/forgot-Password',(req,res)=>{
    res.render('index');
})
//hello

router.get('/user/verify-Otp',userController.verifyOtp)

router.post('/verify-otp',(req,res)=>{
    res.render('index');
})
router.post('/forgot-password',(req,res)=>{
    res.render('index');
})
router.get('/reset-password',(req,res)=>{
    res.render('index');
})
module.exports=router;