const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Wishlist = require('../../models/wishlistModel');
const Cart = require('../../models/cartModel');
const Offer = require('../../models/offerModel');
const mongoose = require('mongoose');

exports.getWishlist = async (req, res) => {
    try {
        res.render('user/user-wishList', { user: req.user});
    } catch (error) {
        console.error('Error rendering wishlist page:', error);
        res.status(500).render('error', { message: 'Error loading wishlist page' });
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
            return res.status(200).json({ wishlist: [], totalPages, currentPage: 1 });
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
        res.status(500).json({ message: 'Error fetching wishlist data' });
    }
};

/* exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({message: 'Product not found' });
        }
        const wishlist = await Wishlist.findOne({user:req.user._id});
        if(!wishlist){
            const wishlist=new Wishlist({
                user:req.user._id,
                products:{product}
            });
           await wishlist.save();
           res.status(200).json({message:'Product Added to Wishlist Successfully'}) 
        }
        const existingItem = await Wishlist.findOne({ user: req.user._id, "products.product":product });
        if (existingItem) {
            return res.status(400).json({message: 'Product already in wishlist' });
        }
        wishlist.products.push({product});
        await wishlist.save();
        res.status(200).json({message: 'Product added to wishlist'});
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({message: 'Error adding to wishlist' });
    }
};
 */

exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const wishlist= await Wishlist.findOne({ user: req.user._id, "products.product":productId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist item not found' });
        }
        wishlist.products = wishlist.products.filter((item)=>item.product.toString() !==productId);
         await wishlist.save();
        return res.status(200).json({ message: 'Product removed from wishlist' });
       } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Error removing from wishlist' });
    }
};
 
exports.toggleWishlistItem = async (req, res) => {
    try {
        const { productId } = req.body;

        const wishlistWithProduct = await Wishlist.findOne({ user: req.user._id, "products.product":productId });

        if (wishlistWithProduct) {
           wishlistWithProduct.products = wishlistWithProduct.products.filter((item)=>item.product.toString()!==productId);
            wishlistWithProduct.save();
            res.status(200).json({ message: 'Product removed from wishlist' });
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
            res.status(200).json({message: 'Product added to wishlist' });
        }
    } catch (error) {
        console.error('Error toggling wishlist item:', error);
        res.status(500).json({message: 'Error updating wishlist' });
    }
};