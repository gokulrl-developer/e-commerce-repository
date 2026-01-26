const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    rating:{
        type:Number,
        required:true,
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        required:true
    }
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);

