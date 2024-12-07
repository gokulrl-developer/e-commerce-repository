const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');
const paginate = require('../middlewares/paginate');
const adminCategoryController = require('../controllers/admin/adminCategoryController');
const adminProductController = require('../controllers/admin/adminProductController');
const adminUserController = require('../controllers/admin/adminUserController');
const adminAuth = require('../middlewares/adminAuth');



router.get('/login', adminAuth.isLoggedIn, (req, res) => {
    res.render('admin/admin-login')
})
router.post('/login', adminAuth.isLoggedIn, adminController.postLogin)
router.get('/dashboard', adminAuth.checkSession, (req, res) => {
    res.render('admin/admin-dashboard')
})

router.post("/logout", adminController.logout);


router.get('/products', adminAuth.checkSession, adminProductController.filterProducts, adminProductController.viewProducts)
router.get('/products/add', adminAuth.checkSession, adminProductController.getAddProduct);
router.get('/products/edit/:id', adminAuth.checkSession, adminProductController.getEditProduct);
router.put('/products/edit/:id', adminAuth.checkSession, uploadMiddleware, adminProductController.putEditProduct);
router.post('/products/add', adminAuth.checkSession, uploadMiddleware, adminProductController.postAddProduct)


router.get('/users', adminAuth.checkSession, paginate, adminUserController.getUsers)



router.get('/categories', adminAuth.checkSession, paginate, adminCategoryController.getCategories);


router.post("/categories/add", adminAuth.checkSession, adminCategoryController.addCategory);
router.put("/categories/edit/:id", adminAuth.checkSession, adminCategoryController.editCategory); // Edit category route
router.delete('/categories/delete/:id', adminAuth.checkSession, adminCategoryController.softDeleteCategory);

module.exports = router;