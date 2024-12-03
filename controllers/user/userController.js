const User=require('../../models/userModel');
const Product=require('../../models/productModel');
const {generateOtp,sendOtpEmail}=require('../../utils/sendOtpUtil');
const {saveOtp,Otp}=require('../../models/otpModel');
const bcrypt = require("bcryptjs");

async function getHome(req,res){
    try{
  res.render('user/user-home',{user:true});
    }catch(error){
      res.status(500).json({Message:"Server down"});
      console.error("Server down : ",err)
    }
}
async function getLogin(req,res){
  try{
res.render('user/user-login');
  }catch(error){
    res.status(500).json({Message:"Cannot retrieve login page"});
    console.error("Error on retrieving login page : ",error)
  }
}

async function getProfile(req,res){
  try{
    res.render('user/user-profile');
  }catch(error){
    res.status(500).json({Message:"Error showing profile"});
    console.error("Error on showing Profile page : ",error)
  }
}

async function postLogin(req,res){
  try{
    const {email,password}=req.body;
    const matchedUser=await User.findOne({email}).lean();
    if(!matchedUser){
      return res.status(401).json({Message:"Invalid credentials"});
    }
    const isMatch=await bcrypt.compare(password, matchedUser.password);
    if(!isMatch){
      return res.status(401).json({Message:"Invalid credentials"});
    }else{
      
      req.session.user=matchedUser;
      res.redirect('/');
    }

  }catch(error){
    res.status(500).json({Message:"Error on Login"});
    console.error("Error on Login : ",err)
  }
}
async function getSignUp(req,res){ 
    res.render('user/user-signup',{user:true});
}

async function signUpPost(req,res){
    try{
    const user=req.body;
     const matchedUser=await User.findOne({email:user.email});
     if(matchedUser){
        return res.status(409).json({message:"Email already registered"})
     }else{
      const otp=generateOtp();
      await sendOtpEmail(user.email,otp)
       await saveOtp(user.email,otp);
       req.session.userData=user;
      res.render('user/user-signup-otp',{user:true,message:"OTP send to Email"})
     }
    }catch(err){
      res.status(500).json({Message:"Internal server error"});
      console.error("Error on user sign-up : ",err)
    }
}

async function shopAll(req,res){
  const products=await Product.find({}).lean();
  products.forEach(product => {
      product.firstImageUrl = product.imageUrl[0];
  });   
  res.render('user/all-products',{user:true,products})
};

async function verifyOtp(req,res){
  try {
    const {otp} = req.body;
    const user=req.session.userData;
    console.log(otp)
    const otpRecord = await Otp.findOne({ email:user.email});
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP",otp });
    }
    const newUser=new User(user);
    newUser.save();

    req.session.user = user;
    req.session.userData=null;
    await Otp.deleteOne({ email:user.email });

    res.status(201).render('user/user-home',{user:true,message: "User registered successfully"});

  } catch (error) {
    res.status(500).json({ message: "Server error" });
    
  }
}

async function resendOtp(req,res){
  try {
    const user=req.session.userData;
    const otpRecord = await Otp.findOne({ email:user.email});
    if (!otpRecord) {
      return res.status(400).json({ message: "Email is not registered" });
    }

    const newOtp = generateOTP();
    otpRecord.otp = newOtp;
    otpRecord.createdAt = Date.now();
    await otpRecord.save();

    await sendOtPEmail(user.email, newOtp);

    res.status(200).json({ message: "OTP resent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports={
signUpPost,
verifyOtp,
resendOtp,
getSignUp,
getLogin,
getHome,
postLogin,
shopAll,
getProfile
}