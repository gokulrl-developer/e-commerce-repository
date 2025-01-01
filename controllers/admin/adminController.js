const Order = require('../../models/orderModel');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } = require('date-fns');

// Helper function to get date range
const getDateRange = (range, startDate, endDate) => {
    const now = new Date();
    switch (range) {
        case 'day':
            return { start: startOfDay(now), end: endOfDay(now) };
        case 'week':
            return { start: startOfWeek(now), end: endOfWeek(now) };
        case 'month':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'year':
            return { start: startOfYear(now), end: endOfYear(now) };
        case 'custom':
            return { start: new Date(startDate), end: new Date(endDate) };
        default:
            return { start: subDays(now, 30), end: now };
    }
};

exports.getDashboard = async (req, res) => {
    try {
        const dateRange = getDateRange('month'); 
        const salesData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: dateRange.start, $lte: dateRange.end },
                    'payment.paymentStatus': 'Completed'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                    totalSales: { $sum: '$payment.totalAmount' },
                    totalOrders: { $sum: 1 },
                    totalDiscount: { $sum: '$payment.discount' },
                        totalCouponDiscount: { $sum: '$payment.couponDiscount'},
                    netAmount: { $sum: { $subtract: ['$payment.totalAmount','$payment.discount'] } },
                }
            }
        ]);

        const summary = salesData.reduce((acc, day) => {
            acc.totalSales += day.totalSales;
            acc.totalOrders += day.totalOrders;
            acc.totalDiscount += day.totalDiscount;
            acc.totalCouponDiscount += day.totalCouponDiscount;
            acc.netAmount += day.netAmount;
            return acc;
        }, { totalSales: 0, totalOrders: 0, totalDiscount: 0, totalCouponDiscount: 0, netAmount: 0 });

        res.render('admin/admin-dashboard', {summary });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).render({ message: 'Error rendering dashboard' });
    }
};

exports.getSalesSummary = async (req, res) => {
    try {
        const { range, startDate, endDate} = req.query;
        const dateRange = getDateRange(range, startDate, endDate);
        const salesData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: dateRange.start, $lte: dateRange.end },
                    'payment.paymentStatus': 'Completed'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                    totalSales: { $sum: '$payment.totalAmount' },
                    totalOrders: { $sum: 1 },
                    totalDiscount: { $sum: '$payment.discount' },
                    totalCouponDiscount: { $sum: '$payment.couponDiscount' },
                    netAmount: { $sum: { $subtract: ['$payment.totalAmount','$payment.discount'] } },
                }
            },
        ]);

        const totalCount = await Order.countDocuments({
            orderDate: { $gte: dateRange.start, $lte: dateRange.end },
            'payment.paymentStatus': 'Completed'
        });

        const summary = salesData.reduce((acc, day) => {
            acc.totalSales += day.totalSales;
            acc.totalOrders += day.totalOrders;
            acc.totalDiscount += day.totalDiscount;
            acc.totalCouponDiscount += day.totalCouponDiscount;
            acc.netAmount += day.netAmount;
            return acc;
        }, { totalSales: 0, totalOrders: 0, totalDiscount: 0, totalCouponDiscount: 0, netAmount: 0 });

        res.status(200).json({
            summary
    });
    } catch (error) {
        console.error('Error generating sales summary:', error);
        res.status(500).json({message: 'Error generating sales summary'});
    }
};


exports.postLogin = (req, res) => {
  if (
    process.env.ADMIN_EMAIL === req.body.email &&
    process.env.ADMIN_PASSWORD === req.body.password
  ) {
    req.session.admin = true;
    res.redirect("/admin/dashboard");
  } else {
    return res.render("admin/admin-error", {
      statusCode: 401,
      message: "Wrong Admin email or password",
    });
  }
};

exports.logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).send("Failed to logout. Please try again.");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("Error in logoutPOST:", error);
    res.status(500).send("Server error during logout.");
  }
};