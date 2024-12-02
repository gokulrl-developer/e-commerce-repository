const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    service: "gmail",  
    auth: {
      user: process.env.EMAIL, 
      pass: process.env.PASSWORD,  
    },
  });



  const sendOtpEmail = async (email, otp) => {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is: ${otp}`,
        
      });
    } catch (error) {
      console.error("Error sending OTP email:", error);
    }
  };




  const generateOtp = () => {
    
    return Math.floor(1000 + Math.random() * 9000).toString();  
  };


  module.exports={
    generateOtp,
    sendOtpEmail
  }