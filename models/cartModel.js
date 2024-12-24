const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",  
      required: true,
    },
    items: [
      {
          product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
          quantity: { type: Number, required: true },
          price: { type: Number, required: true },
          finalPrice: { type: Number },
          originalTotalPrice: { type: Number },
          totalPriceAfterOffer:{type:Number},
          appliedOfferType: { type: String },  //Product ,category ...
          appliedOfferAmount: { type: Number },
          offerDetails: 
              {
                  type: { type: String }, // 'Product' or 'Category'
                  description: { type: String },
                  discountPercentage: { type: Number },
                  totalDiscountAmount: { type: Number },
              },
      },
  ],
totalPrice: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  couponDiscount: { type: Number, default: 0 },
  appliedCouponCode:{type:String},
  couponDetails:{
    couponCode: {type:String},
    couponType:{type:String,enum:['Percentage','Fixed']},
    couponValue:{type:Number},
  }
},
  {
    timestamps: true,  
  }
);

const Cart  = mongoose.model("Cart", cartSchema);

module.exports =  Cart
