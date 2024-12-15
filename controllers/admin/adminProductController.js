const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');

const path = require('path');
const { render } = require('ejs');


module.exports = {
  getAddProduct: async (req, res) => {
    try{
    const categories = await Category.find({}, { _id: 1, categoryName: 1 }).lean();
    if(!categories){
      return res.render('admin/admin-error',{statusCode:404,message:"Add category before adding product"})
    }
    res.render('admin/add-products', { admin: true, categories });
    }catch(error){
      res.render('admin/admin-error',{statusCode:500,message:error.message|| 'error on showing add product page'})
      console.error("Error on Showing Product Add page : ",error)
    }
  },
  postAddProduct: async (req, res) => {
    try {
      let { productName, brand, gender, category, imageUrls, stock, price, specifications,discount,description,rating} = req.body;

     if(!imageUrls || imageUrls.length<4){
      return res.status(400).json({message:"Requires 4 images while adding product"});
     }

      if (!productName || !brand || !gender || !imageUrls || !description || !specifications ||
        !stock || !price || !category || !rating || !discount || imageUrls.length < 4) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const newProduct = new Product({
        productName,
        brand,
        gender,
        category,
        imageUrls,
        stock,
        price,
        discount,
        specifications,
        description,
        imageUrl: imageUrls,
        rating
      });
      console.log(newProduct);
      const savedProduct = await newProduct.save();

      res.status(200).json({
        message: "Product added successfully",
        productId: savedProduct._id,
      });
    } catch (err) {
      console.error("Error adding product:", err);
      res.status(500).json({ message: "Error adding product" });
    }
  },
  getEditProduct:async (req,res)=>{
    try{
    const productId=req.params.id;
    const categories = await Category.find({}, { _id: 1, categoryName: 1 }).lean();
    if(!categories){
      res.render('admin/admin-error',{statusCode:404,message:"Error retrieving categories"})
    }
    const product=await Product.findOne({_id:productId}).populate('category','categoryName').exec();
    if(!product){
      await render('admin/admin-error',{statusCode:404,message:"Error retrieving the product"});
    }
    res.render('admin/edit-products',{product,categories});
    }catch(error){
      console.error("Error on showing the Edit page : ",error);
      res.render('admin/admin-error',{statusCode:500,message:"some unexpected error occured"})
    }
  },
  putEditProduct: async (req, res) => {
    try {
      let { productName, brand, gender, category, imageUrls, stock, price,rating,specifications,discount,description,indicesEdited} = req.body;

       if (!productName ||!brand||!gender||!specifications|| !description || !category || !price || !stock ||!rating ||!discount) {
        return res.status(400).json({message: 'Some fields are missing.' });
      } 
      let product = await Product.findById(req.params.id);
    if (!product) {
      console.error(`Product not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: "Product not found" });
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
            discount,
            specifications,
            description,
            imageUrl: editedImageUrls,
            rating
          },
        { new: true }
      ); 
      return res.status(200).json({message: 'Product updated successfully', product });

    } catch (err) {
      return res.status(500).json({message: 'Failed to update product' });
    }
  },

  viewProducts: async (req, res, next) => {
    const products = req.products;
    const totalPages=req.totalPages;
    const {currentPage}=req.pagination;
    res.render('admin/view-products', {products,currentPage,totalPages})
  },
  filterProducts: async (req, res, next) => {
    try {
      const { skip, limit} = req.pagination;
      const [products, totalProducts] = await Promise.all([
        Product.find({}).populate('category','categoryName').lean().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
        Product.countDocuments(),
      ]);
      const totalPages = Math.ceil(totalProducts / limit);
      req.products = products;
      req.totalPages=totalPages;
      next();
      
    } catch (error) {
      console.error('Error in retrieving products from db : ', error);
      res.render('admin/admin-error',{statusCode:500,message:"some unexpected error while filtering the products"})
    }
  },
  
  updateProductStatus : async (req, res) => {
    try {
      const { id } = req.params;
      const {action} =req.params;
      const status=action==='block'?true:false;
      const product = await Product.findByIdAndUpdate(id,{isBlocked:status},{new:true});
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json({message: `Product has been successfully ${action}ed.` });
    } catch (err) {
      console.error("Error blocking user:", err);
      res.status(500).json({ message: 'Failed to block user.' });
    }
  }
}
