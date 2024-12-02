const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');

const path = require('path');


module.exports = {
  getAddProduct: async (req, res) => {
    const categories = await Category.find({}, { _id: 1, categoryName: 1 }).lean();
    res.render('admin/add-products', { admin: true, categories })
  },
  postAddProduct: async (req, res) => {
    try {
      console.log(req.body);
      let { productName, brand, gender, category, imageUrls, stock, price, specifications, description } = req.body;

      const categoryId = category;

      if (!productName || !brand || !gender || !imageUrls || !description || !specifications ||
        !stock || !price || !categoryId || imageUrls.length < 4) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newProduct = new Product({
        productName,
        brand,
        gender,
        categoryId,
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
      console.log("saved")
    } catch (err) {
      console.error("Error adding product:", err);
      res.status(500).json({ error: "Error adding product" });
    }
  },

  viewProducts: async (req, res, next) => {
    const products = req.products;

    res.render('admin/view-products', { admin: true, products })
  },
  filterProducts: async (req, res, next) => {
    try {
      const products = await Product.findOne({}).populate('categoryId').exec(); 
      req.products = products;
      console.log(products);
      next();
      
    } catch (error) {
      console.error('Error in retrieving products from db : ', error)
    }
  }
}
