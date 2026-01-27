const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Wishlist = require('../../models/wishlistModel');
const Cart = require('../../models/cartModel');
const Offer = require('../../models/offerModel');
const mongoose = require('mongoose');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

exports.getWishlist = async (req, res) => {
    try {
        res.render('user/user-wishlist', { user: req.user});
    } catch (error) {
        console.error('Error rendering wishlist page:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', { message: Messages.INTERNAL_SERVER_ERROR });
    }
};

exports.getWishlistData = async (req, res) => {
    const { currentPage, skip, limit } = req.pagination;
    try {
        // Get the total number of products in the wishlist
        let totalProducts = await Wishlist.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
            { $unwind: "$products" },
            { $count: "count" }
        ]);

        totalProducts = totalProducts.length > 0 ? totalProducts[0].count : 0;
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch the wishlist data with product details
        let wishlist = await Wishlist.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
            { $unwind: "$products" },
            { $lookup: {
                from: "products",
                localField: "products.product",
                foreignField: "_id",
                as: "products.product"
            }},
            { $sort: { "products.createdAt": -1 } },
            { $skip: skip },
            {$limit:limit},
            { $group: {
                _id: "$_id",
                user: { $first: "$user" },
                products: { $push: "$products" },
                createdAt: {$first: "$createdAt"},
                updatedAt: {$first: "$updatedAt"},
            }}
        ]);

        // If no wishlist found, return empty array
        if (wishlist.length === 0) {
            return res.status(StatusCodes.OK).json({ wishlist: [], totalPages, currentPage: 1 });
        }

       // Process the offers for each product in the wishlist
        const wishlistData = wishlist[0].products;
        await Promise.all(wishlistData.map(async (product) => {
            const productOffer = await Offer.findOne({
                offerType: 'Product',
                applicableProduct: product.product[0]._id,
                isActive: true,
                startDate: { $lte: Date.now() },
                expiryDate: { $gte: Date.now() }
            });
            
            const categoryOffer = await Offer.findOne({
                offerType: 'Category',
                applicableCategory: product.product[0].category,
                isActive: true,
                startDate: { $lte: Date.now() },
                expiryDate: { $gte: Date.now() }
            });

            let bestDiscount = 0;
            if (productOffer) {
                bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
            }

            if (categoryOffer) {
                bestDiscount = Math.max(bestDiscount, categoryOffer.discountPercentage);
            }

            let finalDiscountedPrice = product.product[0].price;
            if (bestDiscount > 0) {
                finalDiscountedPrice = product.product[0].price * (1 - bestDiscount / 100);
            }

            product.product[0].finalDiscountedPrice = finalDiscountedPrice;
        }));

        // Return the final wishlist data
        res.json({ wishlist:wishlist[0], totalPages, currentPage });
    } catch (error) {
        console.error('Error fetching wishlist data:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
};

/* exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Product not found' });
        }
        const wishlist = await Wishlist.findOne({user:req.user._id});
        if(!wishlist){
            const wishlist=new Wishlist({
                user:req.user._id,
                products:{product}
            });
           await wishlist.save();
           res.status(StatusCodes.OK).json({message:'Product Added to Wishlist Successfully'}) 
        }
        const existingItem = await Wishlist.findOne({ user: req.user._id, "products.product":product });
        if (existingItem) {
            return res.status(StatusCodes.BAD_REQUEST).json({message: 'Product already in wishlist' });
        }
        wishlist.products.push({product});
        await wishlist.save();
        res.status(StatusCodes.OK).json({message: 'Product added to wishlist'});
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: 'Error adding to wishlist' });
    }
};
 */

exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const wishlist= await Wishlist.findOne({ user: req.user._id, "products.product":productId });
        if (!wishlist) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.WISHLIST_LACKS_ITEM });
        }
        wishlist.products = wishlist.products.filter((item)=>item.product.toString() !==productId);
         await wishlist.save();
        return res.status(StatusCodes.OK).json({ message: Messages.ITEM_REMOVED });
       } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
};
 
exports.toggleWishlistItem = async (req, res) => {
    try {
        const { productId } = req.body;

        const wishlistWithProduct = await Wishlist.findOne({ user: req.user._id, "products.product":productId });

        if (wishlistWithProduct) {
           wishlistWithProduct.products = wishlistWithProduct.products.filter((item)=>item.product.toString()!==productId);
            wishlistWithProduct.save();
            res.status(StatusCodes.OK).json({ message: Messages.ITEM_REMOVED });
        } else {
            let wishlistExisting = await Wishlist.findOne({user:req.user._id});
            if(wishlistExisting){
                wishlistExisting.products.push({product:productId});
            }
            if(!wishlistExisting){
                wishlistExisting= new Wishlist({
                    user:req.user._id,
                    products:{
                        product:productId
                    }
                })
            }
            await wishlistExisting.save();
            res.status(StatusCodes.OK).json({message: Messages.WISHLIST_ITEM_ADDED });
        }
    } catch (error) {
        console.error('Error toggling wishlist item:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: Messages.INTERNAL_SERVER_ERROR });
    }
};