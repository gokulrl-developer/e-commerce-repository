const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');
const paginate = require('../middlewares/paginate');
const categoryController = require('../controllers/admin/categoryController');


router.get('/products', adminController.filterProducts, adminController.viewProducts)
router.get('/products/add',adminController.getAddProduct);
router.get('/products/edit',adminController.getAddProduct);
router.post('/products/add', uploadMiddleware, adminController.postAddProduct)
router.get('/products/edit', (req, res) => {
    res.render('admin/edit-products', { admin: true })
})


router.get('/users', (req, res) => {
    res.render('admin/view-users', { admin: true })
})



router.get('/categories',paginate,categoryController.getCategories);


router.post("/categories/add", categoryController.addCategory);
router.put("/categories/edit/:id", categoryController.editCategory); // Edit category route
router.delete('/categories/delete/:id', categoryController.softDeleteCategory);
module.exports = router;