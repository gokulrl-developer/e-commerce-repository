const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Wishlist = require('../../models/wishlistModel');
const Cart = require('../../models/cartModel');
const Offer = require('../../models/offerModel');

exports.getWishlist = async (req, res) => {
    try {
        res.render('user/user-wishList', { user: req.user});
    } catch (error) {
        console.error('Error rendering wishlist page:', error);
        res.status(500).render('error', { message: 'Error loading wishlist page' });
    }
};

exports.getWishlistData = async (req, res) => {
    try {
        const wishlistItems = await Wishlist.find({ user: req.user._id })
            .populate('product', 'productName price imageUrl rating description category')
            .lean();
        
        const currentDate = new Date();
        const sevenDaysAgo = new Date(currentDate - 7 * 24 * 60 * 60 * 1000);
        
        // Fetch additional offers for products
        const productIds = wishlistItems.map(item => item.product._id);
        const categoryIds = wishlistItems.map(item => item.product.category);
        
        const additionalOffers = await Offer.find({
            $or: [
                { applicableProduct: { $in: productIds } },
                { applicableCategory: { $in: categoryIds } }
            ],
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
            isActive: true
        });

        const transformedWishlist = wishlistItems.map(item => {
            const productOffer = additionalOffers.find(offer => 
                offer.applicableProduct && offer.applicableProduct.equals(item.product._id)
            );
            const categoryOffer = additionalOffers.find(offer => 
                offer.applicableCategory && offer.applicableCategory.equals(item.product.category)
            );
            
            let bestDiscount = 0;
            let bestOfferSource = null;

            if (productOffer) {
                bestDiscount = Math.max(bestDiscount, productOffer.discountPercentage);
                bestOfferSource = productOffer;
            }

            if (categoryOffer) {
                if (categoryOffer.discountPercentage > bestDiscount) {
                    bestDiscount = categoryOffer.discountPercentage;
                    bestOfferSource = categoryOffer;
                }
            }

            let finalDiscountedPrice = item.price;
            let offer = null;

            if (bestDiscount > 0 && bestOfferSource) {
                finalDiscountedPrice = item.product.price * (1 - bestDiscount / 100);
                offer = {
                    title: bestOfferSource.title,
                    discountPercentage: bestDiscount
                };
            }


            return {
                _id: item.product._id,
                wishlistItemId: item._id,
                productName: item.product.productName,
                description: item.product.description,
                image: item.product.imageUrl[0],
                price: item.product.price,
                discountedPrice: Math.floor(finalDiscountedPrice),
                rating: item.product.rating,
                offer: offer,
            };
        });
        res.json({ wishlist: transformedWishlist});
    } catch (error) {
        console.error('Error fetching wishlist data:', error);
        res.status(500).json({ message: 'Error fetching wishlist data' });
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({message: 'Product not found' });
        }

        const existingItem = await Wishlist.findOne({ user: req.user._id, product });
        if (existingItem) {
            return res.status(400).json({message: 'Product already in wishlist' });
        }

        const wishlistItem = new Wishlist({
            user: req.user._id,
            product: productId
        });
        await wishlistItem.save();
        res.json({ success: true, message: 'Product added to wishlist'});
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({message: 'Error adding to wishlist' });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const { wishlistItemId } = req.body;

        const result = await Wishlist.findOneAndDelete({ _id: wishlistItemId, user: req.user._id });
        if (!result) {
            return res.status(404).json({ message: 'Wishlist item not found' });
        }

        res.status(200).json({message: 'Product removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Error removing from wishlist' });
    }
};

exports.toggleWishlistItem = async (req, res) => {
    try {
        const { productId } = req.body;

        const existingItem = await Wishlist.findOne({ user: req.user._id, product:productId });

        if (existingItem) {
            await Wishlist.findByIdAndDelete(existingItem._id);
            res.status(200).json({ message: 'Product removed from wishlist' });
        } else {
            const wishlistItem = new Wishlist({
                user: req.user._id,
                product: productId
            });
            await wishlistItem.save();
            res.status(200).json({message: 'Product added to wishlist' });
        }
    } catch (error) {
        console.error('Error toggling wishlist item:', error);
        res.status(500).json({message: 'Error updating wishlist' });
    }
};