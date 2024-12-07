const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');

const path = require('path');


module.exports = {
  getAddProduct: async (req, res) => {
    try{
    const categories = await Category.find({}, { _id: 1, categoryName: 1 }).lean();
    res.render('admin/add-products', { admin: true, categories })
    }catch(error){
      res.status(500).json({error : "Error on showing product Adding page"});
      console.error("Error on Showing Product Add page : ",error)
    }
  },
  postAddProduct: async (req, res) => {
    try {
      let { productName, brand, gender, category, imageUrls, stock, price, specifications,discount,description,rating} = req.body;

     

      if (!productName || !brand || !gender || !imageUrls || !description || !specifications ||
        !stock || !price || !category || !rating || !discount || imageUrls.length < 4) {
        return res.status(400).json({ error: "Missing required fields" });
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
      console.log("saved")
    } catch (err) {
      console.error("Error adding product:", err);
      res.status(500).json({ error: "Error adding product" });
    }
  },
  getEditProduct:async (req,res)=>{
    try{
    const productId=req.params.id;
    const categories = await Category.find({}, { _id: 1, categoryName: 1 }).lean();
    const product=await Product.findOne({_id:productId}).populate('category','categoryName').exec();
    res.render('admin/edit-products',{product,categories});
    }catch(error){
      console.error("Error on showing the Edit page : ",error);
      res.status(500).json({error:"Error on showing the edit page"});
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
      return res.status(404).json({ error: "Product not found" });
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
      return res.status(200).json({ success: true, message: 'Product updated successfully', product });

    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update product' });
    }
  },

  viewProducts: async (req, res, next) => {
    const products = req.products;
    res.render('admin/view-products', {products })
  },
  filterProducts: async (req, res, next) => {
    try {
      const products = await Product.find({}).populate('category','categoryName').exec(); 
      req.products = products;
      next();
      
    } catch (error) {
      console.error('Error in retrieving products from db : ', error)
    }
  }
}
