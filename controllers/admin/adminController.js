const Order = require('../../models/orderModel');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render({ message: Messages.INTERNAL_SERVER_ERROR });
    }
};

exports.getSalesSummary = async (req, res) => {
    try {
        const {range} = req.query;
        const startDate=req.query.startDate?req.query.startDate:null;
        const endDate=req.query.endDate?req.query.endDate:null; 
        const dateRange = getDateRange(range,startDate,endDate);
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
            orderDate: { $gte:dateRange.start, $lte:dateRange.end },
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

        res.status(StatusCodes.OK).json({
            summary
    });
    } catch (error) {
        console.error('Error generating sales summary:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: Messages.INTERNAL_SERVER_ERROR});
    }
};

/* exports.getChartData = async (req, res) => {
    try {
        const { chartRange, range } = req.query;
        const startDate = req.query.startDate ? req.query.startDate : null;
        const endDate = req.query.endDate ? req.query.endDate : null;
        const dateRange = getDateRange(range, startDate, endDate);
        let timeField;

        switch (chartRange) {
            case "Year":
                timeField = { $year: "$orderDate" };
                break;
            case "Month":
                timeField = { $month: "$orderDate" };
                break;
            case "Day":
                timeField = { $dayOfMonth: "$orderDate" };
                break;
            default:
                timeField = { $hour: "$orderDate" };
        }

        const chartData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: dateRange.start, $lte: dateRange.end },
                    'payment.paymentStatus': 'Completed'
                }
            },
             {
                $group: {
                    _id: timeField,
                    orderDate:{$first:"$orderDate"},
                    orderCount: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    label: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: [chartRange, "Year"] },
                                    then: { $toString: "$_id" }
                                },
                                {
                                    case: { $eq: [chartRange, "Month"] },
                                    then: {
                                        $arrayElemAt: [
                                            ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                                            { $subtract: ["$_id", 1] }
                                        ]
                                    }
                                },
                                {
                                    case: { $eq: [chartRange, "Day"] },
                                    then: { $concat: [{ $toString: "$_id" }, " Day"] }
                                },
                                {
                                    case: { $eq: [chartRange, "Hour"] },
                                    then: { $concat: [{ $toString: "$_id" }, ":00"] }
                                }
                            ],
                            default: "$_id"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    label: { $push: "$label" },
                    orderCount: { $push: "$orderCount" }
                }
            } 
        ]);
  console.log(chartData[0])
        res.status(StatusCodes.OK).json({ chartData });
    } catch (error) {
        console.error("Error occurred while fetching chart data:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error occurred while fetching chart data",
            error: error.message
        });
    }
}; */

  exports.getChartData = async (req, res) => {
    try {
        const { chartRange, range} = req.query;
        const startDate=req.query.startDate?req.query.startDate:null;
        const endDate=req.query.endDate?req.query.endDate:null; 
        const dateRange = getDateRange(range, startDate, endDate);
        let timeField;
        switch (chartRange) {
            case "Year":
                timeField = { format: "%Y-01-01T00:00:00.000Z", date: "$orderDate" };
                break;
            case "Month":
                timeField = { format: "%Y-%m-01T00:00:00.000Z", date: "$orderDate" };
                break;
            case "Day":
                timeField = { format: "%Y-%m-%dT00:00:00.000Z", date: "$orderDate" };
                break;
            default:
                timeField = { format: "%Y-%m-%dT%H:00:00.000Z", date: "$orderDate" };
        }

        const chartData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: dateRange.start, $lte: dateRange.end },
                    'payment.paymentStatus': 'Completed'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: timeField
                    },
                    orderCount: { $sum: 1 }
                }
            },
            {$sort:{_id:-1}
        },
            {
                $group: {
                    _id: null,
                    label: { $push: "$_id" },
                    orderCount: { $push: "$orderCount" }
                }
            }
        ]);
        res.status(StatusCodes.OK).json({ chartData });
    } catch (error) {
        console.error("Error occurred while fetching chart data:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: Messages.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};  

exports.getTopSoldItems = async (req,res) => {
try{
   const {item,range}=req.query;
   const startDate=req.query.startDate?req.query.startDate:null;
   const endDate=req.query.endDate?req.query.endDate:null; 
   const dateRange = getDateRange(range, startDate, endDate);
   let aggregationPipeline
   =[
    {$match: {
        orderDate: { $gte: dateRange.start, $lte: dateRange.end },
        'payment.paymentStatus': 'Completed'
    }
    },
    {$unwind:"$orderItems"},
    {$lookup:{
        from:"products",
        foreignField:"_id",
        localField:"orderItems.product",
        as:"item"
    }},
   {$project:{
     _id:0,
     item: { $arrayElemAt: ["$item", 0] }
    }} 
   ];
   if(item==='Product'){
    aggregationPipeline.push({
       $project:{
        _id:0,
        itemName : "$item.productName",
        itemBrand : "$item.brand",
       } 
    })
   };  
   if(item==='Brand'){
    aggregationPipeline.push({
       $project:{
        _id:0,
        itemName:"$item.brand"
       } 
    })
   };
   if(item==='Category'){
    aggregationPipeline.push({
     $lookup:{from:"categories",
        foreignField:"_id",
        localField:"item.category",
        as:"category"
     }
    });
    aggregationPipeline.push({
    $project:{
        _id:0,
        item: { $arrayElemAt:["$category", 0]}
       } 
    });
    aggregationPipeline.push({
       $project:{
        _id:0,
        itemName:"$item.categoryName"
       }
    });
    };
     aggregationPipeline.push({
        $group:{
            _id:"$itemName",
            orderCount:{$sum:1},
            item:{$first:"$$ROOT"}
        }
    });
    aggregationPipeline.push({
        $sort:{orderCount:-1}
    })
    aggregationPipeline.push({
        $limit:10
    }) 
    const topSoldData=await Order.aggregate(aggregationPipeline);
    res.status(StatusCodes.OK).json({topSoldData});
}catch(error){
    console.error("error while getting top sold items",error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
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
      message: Messages.INVALID_ADMIN_CREDENTIALS,
    });
  }
};

exports.logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(Messages.LOGOUT_FAILURE);
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("Error in logoutPOST:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(Messages.INTERNAL_SERVER_ERROR);
  }
};