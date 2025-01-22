const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');
const paginate = require('../middlewares/paginate');
const adminCategoryController = require('../controllers/admin/adminCategoryController');
const adminProductController = require('../controllers/admin/adminProductController');
const adminUserController = require('../controllers/admin/adminUserController');
const adminAuth = require('../middlewares/adminAuth');
const adminOrderController = require('../controllers/admin/adminOrderController');
const adminOfferController=require('../controllers/admin/adminOfferController');
const adminCouponController=require('../controllers/admin/adminCouponController');
const salesController=require('../controllers/admin/adminSalesController');


router.get('/login', adminAuth.isLoggedIn, (req, res) => {
    res.render('admin/admin-login')
})
router.post('/login', adminAuth.isLoggedIn, adminController.postLogin)
router.get('/dashboard', adminAuth.checkSession,adminController.getDashboard)
router.get('/dashboard/data', adminAuth.checkSession, adminController.getSalesSummary);
router.get('/dashboard/chartData',adminAuth.checkSession,adminController.getChartData);
router.get('/dashboard/topSold',adminAuth.checkSession,adminController.getTopSoldItems)
router.post("/logout", adminController.logout);


//---------------------------PRODUCTS-----------------------------------------------------------------------------//////

router.get('/products', adminAuth.checkSession,paginate,adminProductController.viewProducts)
router.get('/products-add', adminAuth.checkSession, adminProductController.getAddProduct);
router.get('/products/:id', adminAuth.checkSession, adminProductController.getEditProduct);
router.put('/products/:id', adminAuth.checkSession, uploadMiddleware, adminProductController.putEditProduct);
router.post('/products', adminAuth.checkSession, uploadMiddleware, adminProductController.postAddProduct);
router.patch('/products/status/:action/:id',adminAuth.checkSession,adminProductController.updateProductStatus);


router.get('/users', adminAuth.checkSession, paginate, adminUserController.getUsers)
router.patch('/users/block/:id', adminAuth.checkSession, adminUserController.blockUser)
router.patch('/users/unblock/:id', adminAuth.checkSession, adminUserController.unBlockUser)



router.get('/categories', adminAuth.checkSession, paginate, adminCategoryController.getCategories);


router.post("/categories/add", adminAuth.checkSession, adminCategoryController.addCategory);
router.put("/categories/edit/:id", adminAuth.checkSession, adminCategoryController.editCategory); // Edit category route
router.delete('/categories/delete/:id', adminAuth.checkSession, adminCategoryController.softDeleteCategory);


//----------------------------------Orders------------------------------------------------------------
router.get("/orders",adminAuth.checkSession,paginate,adminOrderController.getOrders);
router.get("/order/details/:id",adminAuth.checkSession,adminOrderController.getDetails);
router.patch("/order/edit/:id",adminAuth.checkSession,adminOrderController.updateOrderStatus);
router.post('/orders/return-request', adminAuth.checkSession, adminOrderController.handleReturnRequest);


//---------------------------------Offers--------------------------------------------------------------
router.get("/offers",adminAuth.checkSession,paginate,adminOfferController.getAllOffers);
router.post("/offers/add",adminAuth.checkSession,adminOfferController.createOffer);
router.put("/offers/edit/:id",adminAuth.checkSession,adminOfferController.updateOffer);
router.delete("/offers/delete/:id",adminAuth.checkSession,adminOfferController.deleteOffer);

//----------------------------------Coupons--------------------------------------------------------------
router.get("/coupons",adminAuth.checkSession,paginate,adminCouponController.getCoupons);
router.post("/coupons/add",adminAuth.checkSession,adminCouponController.addCoupon);
router.put("/coupons/edit/:id",adminAuth.checkSession,adminCouponController.editCoupon);
router.delete("/coupons/delete/:id",adminAuth.checkSession,adminCouponController.deleteCoupon);
router.get("/admin/coupons/search/",adminAuth.checkSession,paginate,adminCouponController.searchCoupons);

//-----------------------------------Sales routes--------------------------------------------------------
router.get('/sales-report', adminAuth.checkSession, salesController.renderSalesReportPage);
router.get('/sales-report/data', adminAuth.checkSession, salesController.getSalesReport);
router.get('/sales-report/download/pdf', adminAuth.checkSession, salesController.downloadPdfReport);
router.get('/sales-report/download/excel', adminAuth.checkSession, salesController.downloadExcelReport);
module.exports = router;