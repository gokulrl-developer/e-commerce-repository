const Offer = require('../../models/offerModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');


//------------------helper function to validate-------------------------------------------
const validateOffer = (offerData) => {
    const { title, discountPercentage, applicableProduct, applicableCategory, offerType, startDate, expiryDate, } = offerData;

    const errors = [];
    if (!title || typeof title !== 'string' || title.trim() === '' || title.trim().length>50) {
        errors.push('offer title cannot be empty and must be a string of length less than 50.');
    }
    if (!discountPercentage || isNaN(parseFloat(discountPercentage)) || discountPercentage < 0 || discountPercentage > 100) {
        errors.push('Discount percentage is required and should be a number between 0 and 100');
    }
    if (!offerType || !['Product', 'Category'].includes(offerType)) {
        errors.push('OfferType is required and should be of categories Product or Category')
    }
    if (!applicableCategory && !applicableProduct) {
        errors.push('applicableItem is required');
    }
    
    if (!startDate) {
        errors.push('startDate is required');
    } else if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        errors.push('start Date should be a date');
    };
    if (!expiryDate) {
        errors.push('Expiry Date is required');
    } else if (!(expiryDate instanceof Date) || isNaN(expiryDate.getTime())) {
        errors.push('Expiry Date should be a date');
    };
    if (startDate.getTime() > expiryDate.getTime()) {
        errors.push('Expiry Date cannot be before StartDate');
    }
    return errors;
}
//------------------------get all offers--------------------------------------------------------------------
exports.getAllOffers = async (req, res) => {

    const { limit, skip, currentPage } = req.pagination;
    try {
        const offers = await Offer.find({})
            .skip(skip)
            .limit(limit)
            .populate('applicableProduct')
            .populate('applicableCategory');

        const totalOffers = await Offer.countDocuments({});
        const totalPages = Math.ceil(totalOffers / limit);

        res.render('admin/admin-offers', {
            offers,
            currentPage,
            totalOffers,
            totalPages,
            products: await Product.find({}, 'productName'),
            categories: await Category.find({}, 'categoryName')
        });
    } catch (error) {
        console.error(error);
        res.render('admin/admin-dashboard', { message:"Error while loading the admin offers page" });
    }
};
//-------------------------create Offers----------------------------------------------------
exports.createOffer = async (req, res) => {
    try {
        req.body.startDate=new Date(req.body.startDate);
        req.body.expiryDate=new Date(req.body.expiryDate);
        if(req.body.offerType==='Product'){
            req.body.applicableProduct=req.body.applicableItem;
        }else{
            req.body.applicableCategory=req.body.applicableItem;
        }
        req.body.isActive=req.body.isActive==="true";
        const validationErrors = validateOffer(req.body);
        if (validationErrors.length > 0) {
           return  res.render('admin/admin-offers', { message: "error on create offer form validation", errors: validationErrors })
        }
        const newOffer = new Offer({
            ...req.body
        });

        await newOffer.save();

        return res.status(201).json({ message: 'Offer created successfully' });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(500).json({ message:'Failed to create offer' });
    }
};
//----------------------edit offer---------------------------------------------------
exports.updateOffer = async (req, res) => {
    try {
        const id=req.params.id;
        req.body.startDate=new Date(req.body.startDate);
        req.body.expiryDate=new Date(req.body.expiryDate);
        if(req.body.offerType==='Product'){
            req.body.applicableProduct=req.body.applicableItem;
        }else{
            req.body.applicableCategory=req.body.applicableItem;
        }
        req.body.isActive=req.body.isActive==="true";
        console.log(req.body);
        const validationErrors = validateOffer(req.body);
        if (validationErrors.length > 0) {
            return res.render('admin/admin-offers', { message: "error on create offer form validation", errors: validationErrors })
        };
        const updatedOffer = await Offer.findByIdAndUpdate(id, {
            ...req.body
        }, { new: true });
        if (!updatedOffer) {
            return res.status(404).json({ message:'Offer not found' });
        }

        res.status(200).json({ message: 'Offer updated successfully' });
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ message:'Failed to update offer' });
    }
};
//-------------------------------------delete offer------------------------------------------------------
exports.deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedOffer = await Offer.findByIdAndDelete(id);

        if (!deletedOffer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        res.json({ message: 'Offer deleted successfully' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ message: 'Failed to delete offer' });
    }
};

