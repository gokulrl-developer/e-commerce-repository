const mongoose=require('mongoose');

const productSchema=mongoose.Schema({
productName:{type:String,required:true},
price:{type:Number,required:true},
gender:{type:String,required:true},
brand:{type:String,required:true},
stock:{type:Number,required:true},
rating: { type: Number, required: true },
features:[{type:String}],
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

const Product=mongoose.model('Product',productSchema);
module.exports=Product; 