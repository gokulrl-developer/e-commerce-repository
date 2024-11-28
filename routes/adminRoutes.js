const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');
const paginate = require('../middlewares/paginate');
const categoryController = requie('../controllers/admin/categoryController');
router.get('/', (req, res) => {
    let products = [{ productname: 'bag1', price: 500, img: "https://images.meesho.com/images/products/440647803/oft3v_512.webp" },
    { productname: 'bag1', price: 500, img: "https://images.meesho.com/images/products/440647803/oft3v_512.webp" },
    { productname: 'bag1', price: 500, img: "https://images.meesho.com/images/products/440647803/oft3v_512.webp" },
    { productname: 'bag1', price: 500, img: "https://images.meesho.com/images/products/440647803/oft3v_512.webp" }

    ]
    res.render('index', { admin: true, products });
})

router.get('/products', adminController.filterProducts, adminController.viewProducts)
router.get('/products/add', (req, res) => {
    res.render('admin/add-products', { admin: true })
})
router.post('/products/add', uploadMiddleware, adminController.postAddProduct)
router.get('/products/edit', (req, res) => {
    res.render('admin/edit-products', { admin: true })
})


router.get('/users', (req, res) => {
    res.render('admin/view-users', { admin: true })
})
router.get('/categories', (req, res) => {
    res.render('admin/view-categories', { admin: true })
})
router.get('/categories/add', (req, res) => {
    res.render('admin/add-categories', { admin: true })
})
router.get('/categories/edit', (req, res) => {
    res.render('admin/edit-categories', { admin: true })
})

router.get('/categories', /* adminAuth.checkSession,*/ paginate,categoryController.getCategories);
router.get('/categories/check-duplicate'/* ,adminAuth.checkSession */,  categoryController.checkDuplicateCategory);


router.post("/categories/"/* ,adminAuth.checkSession */, categoryController.addCategory);
router.put("/categories/activate/:id"/* ,adminAuth.checkSession */, categoryController.activateCategory);
router.put("/categories/deactivate/:id"/* ,adminAuth.checkSession */, categoryController.deactivateCategory);
router.put("/categories/:id"/* ,adminAuth.checkSession */, categoryController.editCategory); // Edit category route
router.delete('/categories/:id'/* ,adminAuth.checkSession */, categoryController.softDeleteCategory);
module.exports = router;