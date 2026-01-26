const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

const path = require('path');
const { render } = require('ejs');

function validateFields(object){
  let  {productName,brand,gender,stock,price,imageUrls,description,features,category}=object;
  price=parseFloat(price);
  stock=parseFloat(stock);
  const errors=[];
  if(!productName || typeof productName!== 'string'){
     errors.push(Messages.PRODUCT_NAME_REQUIRED);
}
if(!brand || typeof brand!== 'string'){
     errors.push(Messages.BRAND_REQUIRED);
}
if(!gender || typeof gender!== 'string'){
     errors.push(Messages.GENDER_REQUIRED);
}
if(!description || typeof description!== 'string'){
     errors.push(Messages.DESCRIPTION_REQUIRED);
}
if(!category || typeof category!== 'string'){
     errors.push(Messages.CATEGORY_REQUIRED);
}
if(!price || typeof price!=='number' || price<0){
     errors.push(Messages.PRICE_REQUIRED);
}
if(!stock || typeof stock!=='number' || stock<0){
     errors.push(Messages.STOCK_REQUIRED);
}
features=JSON.parse(features)
if(!Array.isArray(features) || !features.every((element)=>typeof element === "string")){
   errors.push({message:Messages.FEATURES_INVALID})
};
return errors;
}

module.exports = {
  getAddProduct: async (req, res) => {
    try{
    const categories = await Category.find({}, { _id: 1, categoryName: 1 }).lean();
    if(!categories){
      return res.render('admin/admin-error',{statusCode:StatusCodes.NOT_FOUND,message:Messages.CATEGORIES_EMPTY})
    }
    res.render('admin/add-products', { admin: true, categories });
    }catch(error){
      res.render('admin/admin-error',{statusCode:StatusCodes.INTERNAL_SERVER_ERROR,message:Messages.INTERNAL_SERVER_ERROR})
      console.error("Error on Showing Product Add page : ",error)
    }
  },
  postAddProduct: async (req, res) => {
    try {
      let { productName, brand, gender, category, imageUrls, stock, price, features,description} = req.body;
  
      const validationErrors=validateFields({productName:productName.trim(),
        brand:brand.trim(),
        gender:gender.trim(),
        category:category.trim(),
        stock:stock.trim(),
        price:price.trim(),
        features:features.trim(),
        description:description.trim()});
      if(!imageUrls || imageUrls.length !==4){
        validationErrors.push(Messages.FOUR_IMAGES_NEEDED);
        }
      if(validationErrors.length!==0){
        return res.status(StatusCodes.VALIDATION_ERROR).json({validationErrors})
      } 
      features=JSON.parse(features)
      features =features.map((element)=>element.trim());
      features =features.filter((element)=>element!=='');

      const newProduct = new Product({
        productName,
        brand,
        gender,
        category,
        imageUrls,
        stock,
        price,
        features,
        description,
        imageUrl: imageUrls
      });
      const savedProduct = await newProduct.save();

      res.status(StatusCodes.OK).json({
        message: Messages.PRODUCT_ADDED,
        productId: savedProduct._id,
      });
    } catch (err) {
      console.error("Error adding product:", err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
  },
  getEditProduct:async (req,res)=>{
    try{
    const productId=req.params.id;
    const categories = await Category.find({}, { _id: 1, categoryName: 1 }).lean();
    if(!categories){
      res.render('admin/admin-error',{statusCode:StatusCodes.NOT_FOUND,message:Messages.CATEGORIES_EMPTY})
    }
    const product=await Product.findOne({_id:productId}).populate('category','categoryName').exec();
    if(!product){
      return res.status(StatusCodes.NOT_FOUND).json({message:Messages.PRODUCT_NOT_FOUND});
    }
    res.render('admin/edit-products',{product,categories});
    }catch(error){
      console.error("Error on showing the Edit page : ",error);
      res.render('admin/admin-error',{statusCode:StatusCode.INTERNAL_SERVER_ERROR,message:Messages.INTERNAL_SERVER_ERROR})
    }
  },
  putEditProduct: async (req, res) => {
    try {
      let { productName, brand, gender, category, imageUrls, stock, price,features,description,indicesEdited} = req.body;

      const validationErrors=validateFields({productName:productName.trim(),
        brand:brand.trim(),
        gender:gender.trim(),
        category:category.trim(),
        stock:stock.trim(),
        price:price.trim(),
        features:features.trim(),
        description:description.trim()});
      if(validationErrors.length!==0){
        return res.status(StatusCodes.VALIDATION_ERROR).json({validationErrors})
      } 
      let product = await Product.findById(req.params.id);
    if (!product) {
      console.error(`Product not found with ID: ${req.params.id}`);
      return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.PRODUCT_NOT_FOUND });
    }
     let editedImageUrls=[];
     let count=0;
      product.imageUrl.forEach((value,index)=>{
        if(indicesEdited.includes(index)){
          editedImageUrls[index]=imageUrls[count];
          count++;
        }else{
          editedImageUrls[index]=product.imageUrl[index];
        }
      });
      features=JSON.parse(features)
      features =features.map((element)=>element.trim());
      features =features.filter((element)=>element!=='');
       const editedProduct = await Product.findByIdAndUpdate(
        req.params.id,
          {
            productName,
            brand,
            gender,
            category,
            imageUrls,
            stock,
            price,
            features,
            description,
            imageUrl: editedImageUrls
          },
        { new: true }
      ); 
      return res.status(StatusCodes.OK).json({message: Messages.PRODUCT_UPDATED, product });

    } catch (err) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: Messages.INTERNAL_SERVER_ERROR });
    }
  },
viewProducts: async (req, res, next) => {
    try {
      const { skip, limit,currentPage} = req.pagination;
      if(req.xhr){
        const {search} =req.query;
        const regex = new RegExp("^" + search, "i");
        filterObj={'productName': { $regex: regex } }
      }else{
        filterObj={}
      }
      const [products, totalProducts] = await Promise.all([
        Product.find(filterObj).populate('category','categoryName').lean().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
        Product.find(filterObj).countDocuments(),
      ]);
      const totalPages = Math.ceil(totalProducts / limit);
      if(req.xhr){
        return res.status(StatusCodes.OK).json({products,currentPage,totalPages})
      }else{
       return res.render('admin/view-products', {products,currentPage,totalPages})
      }
      
    } catch (error) {
      console.error('Error in showing products : ', error);
      if(req.xhr){
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
      }else{
      res.render('admin/admin-error',{statusCode:StatusCodes.INTERNAL_SERVER_ERROR,message:Messages.INTERNAL_SERVER_ERROR});
      }
    }
  },
  
  updateProductStatus : async (req, res) => {
    try {
      const { id } = req.params;
      const {action} =req.params;
      const status=action==='block'?true:false;
      const product = await Product.findByIdAndUpdate(id,{isBlocked:status},{new:true});
      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.PRODUCT_NOT_FOUND });
      }
      res.status(StatusCodes.OK).json({message:  Messages.PRODUCT_STATUS_UPDATED(action)});
    } catch (err) {
      console.error("Error blocking user:", err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    }
  }
}
