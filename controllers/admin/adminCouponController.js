const Coupon=require('../../models/couponModel');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

//-------------helper function for validation----------------------------
const validateCoupon =(couponData,mode)=>{
    const  {code,couponType,couponValue,minPurchaseAmount,startDate,expiryDate,totalUsageLimit}=couponData;
    
    const errors=[];
    if(!code || typeof code!== 'string'){
       errors.push(Messages.COUPON_CODE_REQUIRED);
}else if(!/^[A-Z0-9]{1,15}$/.test(code)){
       errors.push(Messages.INVALID_COUPON_CODE_FORMAT)
};
   if(!couponType){
       errors.push(Messages.COUPON_TYPE_REQUIRED);
}else if(!["Percentage","Fixed"].includes(couponType)){
       errors.push(Messages.COUPON_TYPE_INVALID)
};
   if(!couponValue){
       errors.push(Messages.COUPON_VALUE_REQUIRED);
}
 else if(typeof couponValue !=='number' || couponValue<0){
     errors.push(Messages.COUPON_VALUE_INVALID);
}else if(couponType==='Percentage' && couponValue>100){
       errors.push(Messages.COUPON_VALUE_RANGE_INVALID);
};
   if(!minPurchaseAmount){
    errors.push(Messages.MIN_PURCHASE_AMOUNT_REQUIRED);
   }else if(typeof minPurchaseAmount !== 'number'){
    errors.push(Messages.MIN_PURCHASE_AMOUNT_INVALID)
   };
   if(!startDate){
    errors.push(Messages.START_DATE_REQUIRED);
   }else if(!(startDate instanceof Date)||isNaN(startDate.getTime())){
    errors.push(Messages.START_DATE_INVALID);
   };
   if(!expiryDate){
    errors.push(Messages.EXPIRY_DATE_REQUIRED);
   }else if(!(expiryDate instanceof Date) ||isNaN(expiryDate.getTime())){
    errors.push(Messages.EXPIRY_DATE_INVALID);
   };
   if(startDate.getTime()>expiryDate.getTime){
    errors.push(Messages.EXPIRY_BEFORE_START);
   }
   if(!totalUsageLimit){
    errors.push(Messages.TOTAL_USAGE_LIMIT_REQUIRED)
   }else if(typeof totalUsageLimit !=='number' || totalUsageLimit <1){
    errors.push(Messages.TOTAL_USAGE_LIMIT_MINIMUM);
   }
  return errors;
}


//------------------render coupons-----------------------------
exports.getCoupons=async (req,res)=>{
    const {skip,limit,currentPage}=req.pagination;
    try{
        const [coupons,totalCoupons]=await Promise.all([Coupon.find({}).skip(skip).limit(limit),
            Coupon.countDocuments(),
        ]);
    const totalPages=Math.ceil(totalCoupons/limit);
    res.render('admin/admin-coupons',{coupons,currentPage,totalPages});
    }catch(error){
        res.render('admin/admin-dashboard',{message:Messages.INTERNAL_SERVER_ERROR});
    }
};

//-----------------add coupon---------------------------------------------------------
exports.addCoupon = async (req, res) => {
    try {
        req.body.startDate=new Date(req.body.startDate);
        req.body.expiryDate=new Date(req.body.expiryDate);
        req.body.isActive=req.body.isActive==="true";
        req.body.couponValue=parseFloat(req.body.couponValue);
        req.body.minPurchaseAmount=parseFloat(req.body.minPurchaseAmount);
        req.body.totalUsageLimit=parseFloat(req.body.totalUsageLimit);
        const validationErrors = validateCoupon(req.body,"ADD");
        if (validationErrors.length > 0) {
            return res.status(StatusCodes.VALIDATION_ERROR).json({ message: Messages.VALIDATION_ERROR, errors: validationErrors });
        }

        const newCoupon = new Coupon({
            ...req.body,
        });

        await newCoupon.save();
        res.status(StatusCodes.OK).json({message: Messages.COUPON_ADDED });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            res.status(StatusCodes.VALIDATION_ERROR).json({message: Messages.COUPON_CODE_EXISTS });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: Messages.INTERNAL_SERVER_ERROR });
        }
    }
};

//--------------------edit coupon---------------------------------------------------
exports.editCoupon=async (req,res)=>{
    const couponId=req.params.id;
    const updateData=req.body;
    try{
        req.body.startDate=new Date(req.body.startDate);
        req.body.expiryDate=new Date(req.body.expiryDate);
        req.body.isActive=req.body.isActive==="true";
        req.body.couponValue=parseFloat(req.body.couponValue);
        req.body.minPurchaseAmount=parseFloat(req.body.minPurchaseAmount);
        req.body.totalUsageLimit=parseFloat(req.body.totalUsageLimit);
        const validationErrors = validateCoupon(updateData,"EDIT");
        if (validationErrors.length > 0) {
            return res.status(StatusCodes.VALIDATION_ERROR).json({message: Messages.VALIDATION_ERROR, errors: validationErrors });
        }
        const updatedCoupon=await Coupon.findByIdAndUpdate(couponId,{...updateData},{new:true});
        if(!updatedCoupon){
            return res.status(StatusCodes.NOT_FOUND).json({message:Messages.COUPON_NOT_FOUND});
        }
        res.status(StatusCodes.OK).json({message:Messages.COUPON_UPDATED});
    }catch(error){
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR});
    }
};

//-------------------------Delete coupon-----------------------------------------------------------
exports.deleteCoupon = async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) {
            return res.status(StatusCodes.NOT_FOUND).json({message: Messages.COUPON_NOT_FOUND });
        }
        res.status(StatusCodes.OK).json({message: Messages.COUPON_DELETED });
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: Messages.INTERNAL_SERVER_ERROR });
    }
};


//-----------------------Search Coupons--------------------------------------------------------------
exports.searchCoupons = async (req, res) => {
    try {
        const {currentPage,skip,limit}=req.pagination;
        let searchQuery = {};
        if (query) {
            searchQuery = {
                $or: [
                    { code: { $regex: query, $options: 'i' } },
                    { couponType: { $regex: query, $options: 'i' } },
                ]
            };
        }

        const coupons = await Coupon.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCoupons = await Coupon.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCoupons / limit);

        res.status(StatusCodes.OK).json({
            coupons,
            currentPage,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
};
