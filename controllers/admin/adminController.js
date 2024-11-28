const Product=require('../../models/productModel');
const path = require('path');
module.exports={
  postAddProduct :async (req, res) => {
      try {
        let { productName, brand, gender, category, imageUrls,stock,price,specifications,description } = req.body;
    
    
        if (!productName || !brand || !gender || !imageUrls || !description || !specifications ||
           !stock || !price || !category || imageUrls.length<4) {
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
          specifications,
          description,
          imageUrl: imageUrls
        });
    
        const savedProduct = await newProduct.save();
    
        res.status(200).json({
          message: "Product added successfully",
          productId: savedProduct._id,
        });
      } catch (err) {
        console.error("Error adding product:", err);
        res.status(500).json({ error: "Error adding product" });
      }
    },
    
    viewProducts:async (req,res,next)=>{
        const products=req.products;
        res.render('admin/view-products',{admin:true,products}) 
    },
    filterProducts:async (req,res,next)=>{
        try{
        const products=await Product.find({}).lean();
        req.products=products;
        next();
        }catch(error){
            console.error('Error in retrieving products from db : ',error)
        }
    }
    }
