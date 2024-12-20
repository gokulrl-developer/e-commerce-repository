const mongoose=require('mongoose');

const productSchema=mongoose.Schema({
productName:{type:String,required:true},
price:{type:Number,required:true},
gender:{type:String,required:true},
brand:{type:String,required:true},
stock:{type:Number,required:true},
priceAfterDiscount: { type: Number, default: 0, },
discount: { type: Number,  min: 0,max: 100,default: 0},
rating: { type: Number, required: true },
specifications:{type:String,required:true},
description:{type:String,required:true},
isBlocked: {
  type: Boolean,
  default: false,
},
category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  imageUrl: [String],
});

// Pre-save hook to calculate and set discountPrice
productSchema.pre('save', function (next) {
  if (this.discount > 0 && this.price) {
    this.discountPrice = Math.round(this.price - (this.price * this.discount) / 100);
  } else {
    this.discountPrice = this.price;
  }
  next();
});
const Product=mongoose.model('Product',productSchema);
module.exports=Product; 