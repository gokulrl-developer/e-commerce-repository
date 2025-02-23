const mongoose=require('mongoose');
const wishlistSchema= new mongoose.Schema({
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true ,

  },
  products:[
  {
    product:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Product',
    required:true
    },
    createdAt:{
      type:Date,
      required:true,
      default:Date.now(),
    }
  }],
},{ timestamps: true })
module.exports=mongoose.model('Wishlist',wishlistSchema);