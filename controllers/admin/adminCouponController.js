const Coupon=require('../../models/couponModel');

//-------------helper function for validation----------------------------
const validateCoupon =(couponData,mode)=>{
    const  {code,couponType,couponValue,minPurchaseAmount,startDate,expiryDate,totalUsageLimit}=couponData;
    
    const errors=[];
    if(!code || typeof code!== 'string'){
       errors.push('coupon code is required and must be a string');
}else if(!/^[A-Z0-9]{1,15}$/.test(code)){
       errors.push('coupon code should contain only numbers and uppercase letters and its maximum length should be 15.')
};
   if(!couponType){
       errors.push('coupon type is required');
}else if(!["Percentage","Fixed"].includes(couponType)){
       errors.push('coupon type should be Percentage or Fixed')
};
   if(!couponValue){
       errors.push('couponValue is required');
}
 else if(typeof couponValue !=='number' || couponValue<0){
     errors.push('couponValue should be a positive number');
}else if(couponType==='Percentage' && couponValue>100){
       errors.push('couponValue should be between 0 and 100 if couponType is Percentage');
};
   if(!minPurchaseAmount){
    errors.push('minPurchaseAmount is required');
   }else if(typeof minPurchaseAmount !== 'number'){
    errors.push('minPurchaseAmount should be a number')
   };
   if(!startDate){
    errors.push('startDate is required');
   }else if(!(startDate instanceof Date)||isNaN(startDate.getTime())){
    errors.push('start Date should be a date');
   };
   if(!expiryDate){
    errors.push('Expiry Date is required');
   }else if(!(expiryDate instanceof Date) ||isNaN(expiryDate.getTime())){
    errors.push('Expiry Date should be a date');
   };
   if(startDate.getTime()>expiryDate.getTime){
    errors.push('Expiry Date cannot be before StartDate');
   }
   if(!totalUsageLimit){
    errors.push('Total usage limit is required')
   }else if(typeof totalUsageLimit !=='number' || totalUsageLimit <1){
    errors.push('Total usage Limit should be a number greater than 1');
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
        res.render('admin/admin-dashboard',{message:"Error while loading the admin coupon page"});
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
            return res.status(400).json({ message: 'Validation error', errors: validationErrors });
        }

        const newCoupon = new Coupon({
            ...req.body,
        });

        await newCoupon.save();
        res.status(200).json({message: 'Coupon added successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            res.status(400).json({message: 'Coupon code already exists' });
        } else {
            res.status(500).json({message: 'Server error occurred while adding coupon' });
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
            return res.status(400).json({message: 'Validation error', errors: validationErrors });
        }
        const updatedCoupon=await Coupon.findByIdAndUpdate(couponId,{...updateData},{new:true});
        if(!updatedCoupon){
            return res.status(404).json({message:"coupon not found"});
        }
        res.status(200).json({message:"Coupon updated successfully"});
    }catch(error){
        console.error(error);
        res.status(500).json({message:"Error on updating coupon"});
    }
};

//-------------------------Delete coupon-----------------------------------------------------------
exports.deleteCoupon = async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) {
            return res.status(404).json({message: 'Coupon not found' });
        }
        res.status(200).json({message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error occurred while deleting coupon' });
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

        res.status(200).json({
            coupons,
            currentPage,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error occurred while searching coupons' });
    }
};
