const Order = require("../../models/orderModel");
const Rating = require("../../models/ratingModel");
const Product = require("../../models/productModel")
const mongoose =require("mongoose");
async function rateProduct(req, res) {
    try {
        const productId = req.params.productId;
        const { rating } = req.body;
        const userId = req.session.user?._id;
        if(typeof rating !== "number"){
            return res.status(400).json({message:"invalid rating field."})
        }
        if(rating>5 || rating<0){
            return res.status(400).json({message:"Rating should be between 0 and 5."})
        }
        const hasProductPurchased = await Order.exists({
            "user.userId": userId,
            orderItems: { $elemMatch: { product: productId } }
        });
        if (!hasProductPurchased) {
            return res.status(403).json({ message: "Rating can only be given on products,you have purchased." })
        }
        const hasAlreadyRated = await Rating.exists({
            userId: userId,
            productId: productId
        });
        if (hasAlreadyRated) {
            return res.status(409).json({ message: "You have already rated the product.You can edit the rating." })
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
        res.status(201).json({ message: "Product rated successfullly." })
    } catch (error) {
        console.log("error rating product", error);
        res.status(500).json({ message: "Internal error while rating product" })
    }
}
async function updateProductRating(req, res) {
    try {
        const ratingId = req.params.ratingId;
        const { rating } = req.body;
        const userId = req.session.user?._id;
        if(typeof rating !== "number"){
            return res.status(400).json({message:"invalid rating field."})
        }
        if(rating>5 || rating<0){
            return res.status(400).json({message:"Rating should be between 0 and 5."})
        }
       
       const updatedRatingDocument= await Rating.findByIdAndUpdate(ratingId,{ rating },{new:true});
       if(!updatedRatingDocument){
        return res.status(403).json({message:"You have not rated the product."})
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
        res.status(201).json({ message: "Rating edited successfullly." })
    } catch (error) {
        console.log("error updating rating", error);
        res.status(500).json({ message: "Internal error while editing rating" })
    }
}
module.exports = {
    rateProduct,
    updateProductRating
}