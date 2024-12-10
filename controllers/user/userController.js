const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const { generateOtp, sendOtpEmail } = require('../../utils/sendOtpUtil');
const { saveOtp, Otp } = require('../../models/otpModel');
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

async function getHome(req, res) {
  try {
    console.log("fdsakjfkjl")
    const newProducts = await Product.find({}).limit(8).lean();
    const topSoldProducts = await Product.find({}).limit(4).lean();

    res.render('user/user-home', { newProducts, topSoldProducts });
  } catch (error) {
    res.status(500).json({ Message: "Server down" });
    console.error("Server down : ", err)
  }
}
async function getLogin(req, res) {
  try {
    res.render('user/user-login');
  } catch (error) {
    res.status(500).json({ Message: "Cannot retrieve login page" });
    console.error("Error on retrieving login page : ", error)
  }
}



async function postLogin(req, res) {
  try {
    console.log("dfsa")
    const { email, password } = req.body;
    const matchedUser = await User.findOne({ email }).lean();
    if (!matchedUser) {

      return res.status(401).json({ Message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, matchedUser.password);
    if (!isMatch) {

      return res.status(401).json({ Message: "Invalid credentials" });
    } else {
      console.log("dsfkdjl")

      req.session.user = matchedUser;
      res.status(200).json({ redirectUrl: "/" });

    }

  } catch (error) {
    res.status(500).json({ Message: "Error on Login" });
    console.error("Error on Login : ", err)
  }
}
async function getSignUp(req, res) {
  try {
    res.render('user/user-signup');
  } catch (error) {
    console.error("error on showing signup page : ", error);
  }
}

async function signUpPost(req, res) {
  try {

    const user = req.body;
    const matchedUser = await User.findOne({ email: user.email });
    if (matchedUser) {
      return res.status(409).json({ Message: "Email already registered" })
    } else {
      const otp = generateOtp();
      await sendOtpEmail(user.email, otp)
      await saveOtp(user.email, otp);
      req.session.userData = user;
      return res.status(200).json({
        redirectUrl: "/verify-otp",
      });
    }
  } catch (err) {
    res.status(500).json({ Message: "Internal server error" });
    console.error("Error on user sign-up : ", err)
  }
}

async function shopAll(req, res) {
  const products = await Product.find({}).lean();
  products.forEach(product => {
    product.firstImageUrl = product.imageUrl[0];
  });
  res.render('user/all-products', { products })
};

async function verifyOtp(req, res) {
  try {
    const { otp } = req.body;
    const user = req.session.userData;
    const otpRecord = await Otp.findOne({ email: user.email });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP", otp });
    }
    const newUser = new User(user);
    newUser.save();
    req.session.userData = null;
    await Otp.deleteOne({ email: user.email });
    return res.status(200).json({
      redirectUrl: "/login",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });

  }
}


async function getProduct(req, res) {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid Product ID" });
    }

    const product = await Product.findOne({ _id: productId });
    const products = await Product.find({}).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.render("user/view-product", { product, products });
  } catch (err) {
    console.error("Error fetching product:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};
async function resendOtp(req, res) {
  try {
    const user = req.session.userData;  
    const otp = generateOtp();
    await sendOtpEmail(user.email, otp)
    await saveOtp(user.email, otp);
    return res.status(200).json({
      Message: "OTP resend successfully"
    });
  } catch (error) {
    res.status(500).json({ Message: "Server error" });
  }
};

function logout(req, res) {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).send("Failed to logout. Please try again.");
      }
      res.redirect("/");
    });
  } catch (error) {
    console.error("Error in logoutPOST:", error);
    res.status(500).send("Server error during logout.");
  }
};
module.exports = {
  signUpPost,
  verifyOtp,
  resendOtp,
  getSignUp,
  getLogin,
  getHome,
  postLogin,
  shopAll,
  getProduct,
  logout,
}