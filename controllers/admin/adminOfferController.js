const Offer = require('../../models/offerModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

//------------------helper function to validate-------------------------------------------
const validateOffer = (offerData,mode) => {
    const { title, discountPercentage, applicableProduct, applicableCategory, offerType, startDate, expiryDate, } = offerData;

    const errors = [];
    if (!title || typeof title !== 'string' || title.trim() === '' || title.trim().length>50) {
        errors.push(Messages.OFFER_TITLE_INVALID_FORMAT);
    }
    if (!discountPercentage || isNaN(parseFloat(discountPercentage)) || discountPercentage < 0 || discountPercentage > 100) {
        errors.push(Messages.DISCOUNT_PERCENTAGE_INVALID);
    }
    if (!offerType || !['Product', 'Category'].includes(offerType)) {
        errors.push(Messages.OFFER_TYPE_INVALID)
    }
    if (!applicableCategory && !applicableProduct) {
        errors.push(Messages.APPLICABLE_ITEM_REQUIRED);
    }
    
    if (!startDate) {
        errors.push(Messages.START_DATE_REQUIRED);
    } else if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        errors.push(Messages.START_DATE_INVALID);
    };
    if (!expiryDate) {
        errors.push(Messages.EXPIRY_DATE_REQUIRED);
    } else if (!(expiryDate instanceof Date) || isNaN(expiryDate.getTime())) {
        errors.push(Messages.EXPIRY_DATE_INVALID);
    };
    if (startDate.getTime() > expiryDate.getTime()) {
        errors.push(Messages.EXPIRY_BEFORE_START);
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
        res.render('admin/admin-dashboard', { message:Messages.INTERNAL_SERVER_ERROR });
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
        const validationErrors = validateOffer(req.body,"ADD");
        if (validationErrors.length > 0) {
           return  res.render('admin/admin-offers', { message: Messages.VALIDATION_ERROR, errors: validationErrors })
        }
        const newOffer = new Offer({
            ...req.body
        });

        await newOffer.save();

        return res.status(StatusCodes.CREATED).json({ message: Messages.OFFER_CREATED });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message:Messages.INTERNAL_SERVER_ERROR });
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
        const validationErrors = validateOffer(req.body,"EDIT");
        if (validationErrors.length > 0) {
            return res.render('admin/admin-offers', { message: Messages.VALIDATION_ERROR, errors: validationErrors })
        };
        const updatedOffer = await Offer.findByIdAndUpdate(id, {
            ...req.body
        }, { new: true });
        if (!updatedOffer) {
            return res.status(StatusCodes.NOT_FOUND).json({ message:Messages.OFFER_NOT_FOUND });
        }

        res.status(StatusCodes.OK).json({ message: Messages.OFFER_UPDATED });
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message:Messages.INTERNAL_SERVER_ERROR });
    }
};
//-------------------------------------delete offer------------------------------------------------------
exports.deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedOffer = await Offer.findByIdAndDelete(id);

        if (!deletedOffer) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.OFFER_NOT_FOUND });
        }

        res.json({ message: Messages.OFFER_DELETED });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
};

