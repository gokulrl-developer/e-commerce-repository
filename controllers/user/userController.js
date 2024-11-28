const User=require('../../models/userModel');
const {generateOtp,sendOtpEmail}=require('../../utils/sendOtpUtil');
const {saveOtp,Otp}=require('../../models/otpModel');

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
      generateOtp();
      await sendOtpEmail(user.email,Otp)
       await saveOtp(user.email,Otp);
       req.session.userData=user;
      res.render('user/user-signup-otp',{user:true,message:"OTP send to Email"})
     }
    }catch(err){
      res.status(500).json({Message:"Internal server error"});
      console.error("Error on user sign-up : ",err)
    }
}


async function verifyOtp(req,res){
  try {
    const {otp} = req.body;
    const user=req.session.userData;
    const otpRecord = await Otp.findOne({ email:user.email});
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP",otp });
    }
    const newUser=new User(user);
    newUser.save();

    req.session.user = user;
    req.session.userData=null;
    await Otp.deleteOne({ email:user.email });

    res.status(201).render('user-login',{user:true,message: "User registered successfully"});

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
getSignUp
}