const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Offer = require('../../models/offerModel');
const { generateOtp, sendOtpEmail } = require('../../utils/sendOtpUtil');
const { saveOtp, Otp } = require('../../models/otpModel');
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

async function getHome(req, res) {
  try {
    const newProducts = await Product.find({}).limit(8).lean();
    const topSoldProducts = await Product.find({}).limit(4).lean();
    for (let product of newProducts) {
      const productOffer = await Offer.findOne({
        offerType: 'Product', applicableProduct: product._id, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });
      const categoryOffer = await Offer.findOne({
        offerType: 'Category', applicableCategory: product.category, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });
  
      let bestDiscount = 0;
      if (productOffer) {
        bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
      }
  
      if (categoryOffer) {
        if (categoryOffer.discountPercentage > bestDiscount) {
          bestDiscount = categoryOffer.discountPercentage;
        }
      }
      let finalDiscountedPrice = product.price;
      if (bestDiscount > 0) {
        finalDiscountedPrice = product.price * (1 - bestDiscount / 100);
      }
      product.finalDiscountedPrice = finalDiscountedPrice;
    };
    for (let product of topSoldProducts) {
      const productOffer = await Offer.findOne({
        offerType: 'Product', applicableProduct: product._id, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });
      const categoryOffer = await Offer.findOne({
        offerType: 'Category', applicableCategory: product.category, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });
  
      let bestDiscount = 0;
      if (productOffer) {
        bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
      }
  
      if (categoryOffer) {
        if (categoryOffer.discountPercentage > bestDiscount) {
          bestDiscount = categoryOffer.discountPercentage;
        }
      }
      let finalDiscountedPrice = product.price;
      if (bestDiscount > 0) {
        finalDiscountedPrice = product.price * (1 - bestDiscount / 100);
      }
      product.finalDiscountedPrice = finalDiscountedPrice;
    };
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
    const { email, password } = req.body;
    const matchedUser = await User.findOne({ email }).lean();
    if (!matchedUser) {
      return res.status(401).json({ message: "invalid Credentials" });
    }
    if (matchedUser.status === 'Blocked') {
      return res.status(401).json({ message: "User is blocked" });
    }
    const isMatch = await bcrypt.compare(password, matchedUser.password);
    if (!isMatch) {
      return res.status(401).json({message:"Invalid Credentials"});
    } else {
      req.session.user = matchedUser;
      res.status(200).json({ redirectUrl: "/" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Error on Login" });
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
  const {currentPage,limit,skip}=req.pagination;
  const products = await Product.find({}).skip(skip).limit(limit).lean();
  const categories = await Category.find({}).lean();
  const totalProducts=await Product.find({}).countDocuments();
  const totalPages=Math.ceil(totalProducts/limit);
  for (let product of products) {
    const productOffer = await Offer.findOne({
      offerType: 'Product', applicableProduct: product._id, isActive: true,
      startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
    });
    const categoryOffer = await Offer.findOne({
      offerType: 'Category', applicableCategory: product.category, isActive: true,
      startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
    });

    let bestDiscount = 0;
    if (productOffer) {
      bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
    }

    if (categoryOffer) {
      if (categoryOffer.discountPercentage > bestDiscount) {
        bestDiscount = categoryOffer.discountPercentage;
      }
    }
    let finalDiscountedPrice = product.price;
    if (bestDiscount > 0) {
      finalDiscountedPrice = product.price * (1 - bestDiscount / 100);
    }
    product.finalDiscountedPrice = finalDiscountedPrice;
  };
  res.render('user/all-products', { products, categories,currentPage,totalPages })
};


async function filterProducts(req, res) {
  const {currentPage,limit,skip}=req.pagination;
  try {
    const { categories, filters, sort } = req.body;
    if (categories.length === 0 && filters.length === 0 && !sort) { return res.redirect('/shopAll') }
    const filter = [];
    if (categories.length !== 0) { filter.push({ category: { $in: [...categories] } }) };
    if (filters.gender) { filter.push({ gender: filters.gender }) };
    if (filters.minPrice) { filter.push({ price: { $gte: filters.minPrice } }) };
    if (filters.maxPrice) { filter.push({ price: { $lte: filters.maxPrice } }) };
    if (filters.search) {
      const regex = new RegExp("^" + filters.search, "i");
      filter.push({ productName: { $regex: regex } })
    };
    let sortObj = {};
    if (sort === 'rating') {
      sortObj.rating = 1;
    } else if (sort === 'priceDesc') {
      sortObj.price = -1;
    } else if (sort === 'priceAsc') {
      sortObj.price = 1;
    } else if (sort === 'latest') {
      sortObj.createdAt = -1;
    } else if (sort === 'nameAsc') {
      sortObj.productName = 1;
    } else if (sort === 'nameDesc') {
      sortObj.productName = -1;
    }
    const products = await Product.find({ $and: filter }).sort(sortObj).skip(skip).limit(limit).lean();
    const totalProducts=await Product.find({ $and: filter }).sort(sortObj).countDocuments();
    const totalPages=Math.ceil(totalProducts/limit);
    for (let product of products) {
      const productOffer = await Offer.findOne({
        offerType: 'Product', applicableProduct: product._id, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });
      const categoryOffer = await Offer.findOne({
        offerType: 'Category', applicableCategory: product.category, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });

      let bestDiscount = 0;
      if (productOffer) {
        bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
      }

      if (categoryOffer) {
        if (categoryOffer.discountPercentage > bestDiscount) {
          bestDiscount = categoryOffer.discountPercentage;
        }
      }
      let finalDiscountedPrice = product.price;
      if (bestDiscount > 0) {
        finalDiscountedPrice = product.price * (1 - bestDiscount / 100);
      }
      product.finalDiscountedPrice = finalDiscountedPrice;
    };
    res.status(200).json({ products,currentPage,totalPages});
  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).json({ message: 'Error filtering products' });
  }
}

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

// Render Forgot Password Page
async function getForgotPasswordEmail(req, res) {
  res.render('user/user-forgot-password');
};

// Handle Forgot Password Request (Generate OTP)

async function postForgotPasswordEmail(req, res) {
  const { email } = req.body;

  try {
    const matchedUser = await User.findOne({ email });
    if (!matchedUser) {
      return res.status(401).json({ Message: "Email not registered" })
    } else {
      const otp = generateOtp();
      await sendOtpEmail(email, otp)
      await saveOtp(email, otp);
      req.session.tempEmail = email;
      return res.status(200).json({
        redirectUrl: "/forgot-password-otp",
      });
    }
  } catch (err) {
    res.status(500).json({ Message: "Error on verifying email" });
    console.error("Error on verifying Email : ", err)
  }
}
async function getForgotPasswordOtp(req, res) {
  try {
    res.render('user/user-forgot-password-otp');

  } catch (error) {
    res.status(500).json({ message: "Error on showing the otp recieving page" })
  }
}
async function postForgotPasswordOtp(req, res) {
  try {
    const { otp } = req.body;
    const email = req.session.tempEmail;
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP", otp });
    }
    req.session.isForgotPasswordVerified = true;
    await Otp.deleteOne({ email });
    return res.status(200).json({
      redirectUrl: "/forgot-password-password",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });

  }
}

async function resendForgotPasswordOtp(req, res) {
  try {
    const email = req.session.tempEmail;
    const otp = generateOtp();
    await sendOtpEmail(email, otp)
    await saveOtp(email, otp);
    return res.status(200).json({
      Message: "OTP resend successfully"
    });
  } catch (error) {
    res.status(500).json({ Message: "Server error on resending OTP" });
  }
};

async function getChangePassword(req, res) {
  res.render('user/user-reset-password');
};
async function postChangePassword(req, res) {
  try {
    let password = req.body.password;
    const email = req.session.tempEmail;
    const isVerified = req.session.isForgotPasswordVerified;
    if (!isVerified || isVerified !== true) {
      return res.status(401).json({ message: "Please verify your email" })
    }
    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);
    const user = await User.findOneAndUpdate({ email }, { password }, { new: true });
    if (!user) {
      return res.status(401).json({ message: "The user is not found" })
    }
    req.session.user = user;
    req.session.tempEmail = null;
    req.session.isForgotPasswordVerified = null;
    return res.status(200).json({
      redirectUrl: "/",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error on changing password" });

  }
}
async function getResetPassword(req, res) {
  res.render('user/user-change-password');
};
async function postResetPassword(req, res) {
  try {
    let {newPassword,currentPassword} = req.body;
    const regex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,16}$/;
  
    if (!regex.test(newPassword)) {
      return res.status(400).json({message:"Password must be 8-16 characters long, and include a number, uppercase, lowercase, and special character."});
       }
    const email=req.user.email;
    if(!email){
      return res.status(401).json({message:"You are not logged in"})
    }
    const salt = await bcrypt.genSalt(10);
    currentPassword = await bcrypt.hash(currentPassword, salt);
    const user = await User.findOne({ email }, { currentPassword });
    if (!user) {
      return res.status(401).json({ message: "The user is not found" })
    };
    
     user.password=newPassword;
     await user.save();

    req.user = user;
     return res.status(200).json({
      message:"password changed successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error on changing password" });

  }
}


async function getProduct(req, res) {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.render('user/user-error', { statusCode: 400, message: "invalid Product Id" })
    }

    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.render('user/user-error', { statusCode: 404, message: "No product found" })
    }
    const productOffer = await Offer.findOne({
      offerType: 'Product', applicableProduct: product._id, isActive: true,
      startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
    });
    const categoryOffer = await Offer.findOne({
      offerType: 'Category', applicableCategory: product.category, isActive: true,
      startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
    });

    let bestDiscount = 0;
    let appliedOffer=null;
    if (productOffer) {
      bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
      appliedOffer=productOffer;
    }

    if (categoryOffer) {
      if (categoryOffer.discountPercentage > bestDiscount) {
        bestDiscount = categoryOffer.discountPercentage;
        appliedOffer=categoryOffer;
      }
    }
    let finalDiscountedPrice = product.price;
    if (bestDiscount > 0) {
      finalDiscountedPrice = product.price * (1 - bestDiscount / 100);
    }
    product.finalDiscountedPrice = finalDiscountedPrice;
    product.appliedOffer=appliedOffer;
    
    const products = await Product.find({}).lean().limit(8);
    for (let product of products) {
      const productOffer = await Offer.findOne({
        offerType: 'Product', applicableProduct: product._id, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });
      const categoryOffer = await Offer.findOne({
        offerType: 'Category', applicableCategory: product.category, isActive: true,
        startDate: { $lte: Date.now() }, expiryDate: { $gte: Date.now() }
      });
  
      let bestDiscount = 0;
      if (productOffer) {
        bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
      }
  
      if (categoryOffer) {
        if (categoryOffer.discountPercentage > bestDiscount) {
          bestDiscount = categoryOffer.discountPercentage;
        }
      }
      let finalDiscountedPrice = product.price;
      if (bestDiscount > 0) {
        finalDiscountedPrice = product.price * (1 - bestDiscount / 100);
      }
      product.finalDiscountedPrice = finalDiscountedPrice;
    };
    res.render("user/view-product", { product, products });
    
  } catch (err) {
    console.error("Error fetching product:", err.message);
    return res.render('user/user-error', { statusCode: 500, message: "Server error while retrieving the product" });
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
      res.redirect("/login");
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
  filterProducts,
  getForgotPasswordEmail,
  postForgotPasswordEmail,
  getForgotPasswordOtp,
  postForgotPasswordOtp,
  resendForgotPasswordOtp,
  getChangePassword,
  postChangePassword,
  getResetPassword,
  postResetPassword
}