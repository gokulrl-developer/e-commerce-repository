const Order = require("../../models/orderModel");
const Rating = require("../../models/ratingModel");
const Product = require("../../models/productModel")
const mongoose =require("mongoose");
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")
async function rateProduct(req, res) {
    try {
        const productId = req.params.productId;
        const { rating } = req.body;
        const userId = req.session.user?._id;
        if(typeof rating !== "number"){
            return res.status(StatusCodes.BAD_REQUEST).json({message:Messages.RATING_FIELD_REQUIRED})
        }
        if(rating>5 || rating<0){
            return res.status(StatusCodes.BAD_REQUEST).json({message:Messages.INVALID_RATING_VALUE})
        }
        const hasProductPurchased = await Order.exists({
            "user.userId": userId,
            orderItems: { $elemMatch: { product: productId } }
        });
        if (!hasProductPurchased) {
            return res.status(StatusCodes.FORBIDDEN).json({ message: Messages.UNPURCHASED_PRODUCT})
        }
        const hasAlreadyRated = await Rating.exists({
            userId: userId,
            productId: productId
        });
        if (hasAlreadyRated) {
            return res.status(StatusCodes.CONFLICT).json({ message: Messages.ALREADY_RATED})
        };
        await Rating.create({ rating, userId, productId });
        const updatedData = await Rating.aggregate([
            { $match: { productId: new mongoose.Types.ObjectId(productId) } },
            { $group: { _id: null, totalExistingRating: { $sum: "$rating" }, existingRatingCount: { $sum: 1 } } }
        ]);
        console.log("updated rating data",updatedData)
        const { totalExistingRating, existingRatingCount } = updatedData[0] || {
            totalExistingRating: 0,
            existingRatingCount: 0
        };
        const newAverageRating = (totalExistingRating) / (existingRatingCount);
        const roundedRating = Math.round(newAverageRating * 10) / 10;
        await Product.findByIdAndUpdate(productId, { rating: roundedRating }, { new: true })
        res.status(StatusCodes.CREATED).json({ message: Messages.PRODUCT_RATED_SUCCESS})
    } catch (error) {
        console.log("error rating product", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR })
    }
}
async function updateProductRating(req, res) {
    try {
        const ratingId = req.params.ratingId;
        const { rating } = req.body;
        const userId = req.session.user?._id;
        if(typeof rating !== "number"){
            return res.status(StatusCodes.BAD_REQUEST).json({message:Messages.RATING_FIELD_REQUIRED})
        }
        if(rating>5 || rating<0){
            return res.status(StatusCodes.BAD_REQUEST).json({message:Messages.INVALID_RATING_VALUE})
        }
       
       const updatedRatingDocument= await Rating.findByIdAndUpdate(ratingId,{ rating },{new:true});
       if(!updatedRatingDocument){
        return res.status(StatusCodes.FORBIDDEN).json({message: Messages.PRODUCT_NOT_RATED})
       } 
       const averageRatingData = await Rating.aggregate([
            { $match: { productId: new mongoose.Types.ObjectId(updatedRatingDocument.productId)} },
            { $group: { _id: null, totalExistingRating: { $sum: "$rating" }, existingRatingCount: { $sum: 1 } } }
        ]);
        const { totalExistingRating, existingRatingCount } = averageRatingData[0] || {
            totalExistingRating: 0,
            existingRatingCount: 0
        };
        const newAverageRating = (totalExistingRating) / (existingRatingCount);
        const roundedRating = Math.round(newAverageRating * 10) / 10;
        await Product.findByIdAndUpdate(updatedRatingDocument.productId, { rating: roundedRating }, { new: true })
        res.status(StatusCodes.CREATED).json({ message: Messages.RATING_EDITED })
    } catch (error) {
        console.log("error updating rating", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR })
    }
}
module.exports = {
    rateProduct,
    updateProductRating
}