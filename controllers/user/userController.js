const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Offer = require('../../models/offerModel');
const { generateOtp, sendOtpEmail } = require('../../utils/sendOtpUtil');
const { saveOtp, Otp } = require('../../models/otpModel');
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Order=require('../../models/orderModel');
const Rating=require('../../models/ratingModel');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

async function getHome(req, res) {
  try {
    const newProducts = await Product.find({ isBlocked: false }).limit(8).lean();
    const topSoldProducts = await Product.find({ isBlocked: false }).limit(4).lean();
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
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ Message: Messages.INTERNAL_SERVER_ERROR });
    console.error("Server down : ", err)
  }
}

async function getLogin(req, res) {
  try {
    res.render('user/user-login');
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ Message: Messages.INTERNAL_SERVER_ERROR });
    console.error("Error on retrieving login page : ", error)
  }
}

async function postLogin(req, res) {
  try {
    const { email, password } = req.body;
    const matchedUser = await User.findOne({ email }).lean();
    if (!matchedUser) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.INVALID_CREDENTIALS });
    }
    if (matchedUser.status === 'Blocked') {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.USER_BLOCKED });
    }
    const isMatch = await bcrypt.compare(password, matchedUser.password);
    if (!isMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.INVALID_CREDENTIALS });
    } else {
      req.session.user = matchedUser;
      res.status(StatusCodes.OK).json({ redirectUrl: "/" });
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message || Messages.INTERNAL_SERVER_ERROR });
    console.error("Error on Login : ", error)
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
      return res.status(StatusCodes.CONFLICT).json({ Message: Messages.EMAIL_ALREADY_REGISTERED })
    } else {
      const otp = generateOtp();
      await sendOtpEmail(user.email, otp)
      await saveOtp(user.email, otp);
      req.session.userData = user;
      return res.status(StatusCodes.OK).json({
        redirectUrl: "/verify-otp",
      });
    }
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ Message: Messages.INTERNAL_SERVER_ERROR });
    console.error("Error on user sign-up : ", err)
  }
}

async function shopAll(req, res) {
  const { currentPage, limit, skip } = req.pagination;
  const products = await Product.find({ isBlocked: false }).skip(skip).limit(limit).lean();
  const categories = await Category.find({}).lean();
  const totalProducts = await Product.find({ isBlocked: false }).countDocuments();
  const totalPages = Math.ceil(totalProducts / limit);
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
  res.render('user/all-products', { products, categories, currentPage, totalPages })
};


async function filterProducts(req, res) {
  const { currentPage, limit, skip } = req.pagination;
  try {
    const { categories, filters, sort } = req.body;
    if (categories.length === 0 && filters.length === 0 && !sort) { return res.redirect('/shopAll') }
    const filter = [{ isBlocked: false }];
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
    const totalProducts = await Product.find({ $and: filter }).sort(sortObj).countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
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
    res.status(StatusCodes.OK).json({ products, currentPage, totalPages });
  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
}

async function verifyOtp(req, res) {
  try {
    const { otp } = req.body;
    const user = req.session.userData;
    const otpRecord = await Otp.findOne({ email: user.email });
    if (!otpRecord) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: Messages.INVALID_OTP, otp });
    }
    const newUser = new User(user);
    newUser.save();
    req.session.userData = null;
    await Otp.deleteOne({ email: user.email });
    return res.status(StatusCodes.OK).json({
      redirectUrl: "/login",
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });

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
      return res.status(StatusCodes.UNAUTHORIZED).json({ Message: Messages.EMAIL_NOT_REGISTERED })
    } else {
      const otp = generateOtp();
      await sendOtpEmail(email, otp)
      await saveOtp(email, otp);
      req.session.tempEmail = email;
      return res.status(StatusCodes.OK).json({
        redirectUrl: "/forgot-password-otp",
      });
    }
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ Message: Messages.INTERNAL_SERVER_ERROR });
    console.error("Error on verifying Email : ", err)
  }
}
async function getForgotPasswordOtp(req, res) {
  try {
    res.render('user/user-forgot-password-otp');

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR })
  }
}
async function postForgotPasswordOtp(req, res) {
  try {
    const { otp } = req.body;
    const email = req.session.tempEmail;
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: Messages.INVALID_OTP, otp });
    }
    req.session.isForgotPasswordVerified = true;
    await Otp.deleteOne({ email });
    return res.status(StatusCodes.OK).json({
      redirectUrl: "/forgot-password-password",
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });

  }
}

async function resendForgotPasswordOtp(req, res) {
  try {
    const email = req.session.tempEmail;
    const otp = generateOtp();
    await sendOtpEmail(email, otp)
    await saveOtp(email, otp);
    return res.status(StatusCodes.OK).json({
      Message: Messages.OTP_RESEND
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ Message: Messages.INTERNAL_SERVER_ERROR });
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
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.EMAIL_NOT_VERIFIED })
    }
    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);
    const user = await User.findOneAndUpdate({ email }, { password }, { new: true });
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.USER_NOT_FOUND })
    }
    req.session.user = user;
    req.session.tempEmail = null;
    req.session.isForgotPasswordVerified = null;
    return res.status(StatusCodes.OK).json({
      redirectUrl: "/",
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });

  }
}
async function getResetPassword(req, res) {
  res.render('user/user-change-password');
};
async function postResetPassword(req, res) {
  try {
    let { newPassword, currentPassword } = req.body;
    const regex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,16}$/;

    if (!regex.test(newPassword)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: Messages.PASSWORD_INVALID_FORMAT });
    }
    const email = req.user.email;
    if (!email) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.USER_NOT_LOGGED })
    }
    const salt = await bcrypt.genSalt(10);
    currentPassword = await bcrypt.hash(currentPassword, salt);
    const user = await User.findOne({ email }, { currentPassword });
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.USER_NOT_FOUND })
    };

    user.password = newPassword;
    await user.save();

    req.user = user;
    return res.status(StatusCodes.OK).json({
      message: Messages.PASSWORD_RESET
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });

  }
}


async function getProduct(req, res) {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.render('user/user-error', { statusCode: StatusCodes.BAD_REQUEST, message: Messages.INVALID_PRODUCT_ID })
    }

    const product = await Product.findOne({ _id: productId, isBlocked: false });
    if (!product) {
      return res.render('user/user-error', { statusCode: StatusCodes.BAD_REQUEST, message: Messages.PRODUCT_NOT_FOUND })
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
    let appliedOffer = null;
    if (productOffer) {
      bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
      appliedOffer = productOffer;
    }

    if (categoryOffer) {
      if (categoryOffer.discountPercentage > bestDiscount) {
        bestDiscount = categoryOffer.discountPercentage;
        appliedOffer = categoryOffer;
      }
    }
    let finalDiscountedPrice = product.price;
    if (bestDiscount > 0) {
      finalDiscountedPrice = product.price * (1 - bestDiscount / 100);
    }
    product.finalDiscountedPrice = finalDiscountedPrice;
    product.appliedOffer = appliedOffer;

    const products = await Product.find({ isBlocked: false }).lean().limit(8);
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
    const userId = req.session.user?._id;
    let hasProductPurchased, hasAlreadyRated,rating;
    const purchasedOrderId = await Order.exists({
      "user.userId": userId,
      orderItems: { $elemMatch: { product: productId } }
    });
    hasProductPurchased = purchasedOrderId ? true : false;
    const existingRating = await Rating.findOne({
      userId: userId,
      productId: productId
    });
    hasAlreadyRated = existingRating ? true : false;
    res.render("user/view-product", { product, products, hasProductPurchased, hasAlreadyRated,rating:existingRating });

  } catch (err) {
    console.error("Error fetching product:", err.message);
    return res.render('user/user-error', { statusCode: StatusCodes.INTERNAL_SERVER_ERROR, message: Messages.INTERNAL_SERVER_ERROR });
  }
};
async function resendOtp(req, res) {
  try {
    const user = req.session.userData;
    const otp = generateOtp();
    await sendOtpEmail(user.email, otp)
    await saveOtp(user.email, otp);
    return res.status(StatusCodes.OK).json({
      Message: Messages.OTP_RESEND
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ Message: Messages.INTERNAL_SERVER_ERROR });
  }
};

function logout(req, res) {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(Messages.LOGOUT_FAILURE);
      }
      res.redirect("/login");
    });
  } catch (error) {
    console.error("Error in logoutPOST:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(Messages.INTERNAL_SERVER_ERROR);
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