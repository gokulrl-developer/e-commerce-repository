const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      customerName: {
        type: String,
        required: true
      },
      customerEmail: {
        type: String,
        required: true
      },
      shippingAddress: {
        Name: { type: String, required: true },
        HouseName: { type: String, required: true },
        LocalityStreet: { type: String, required: true },
        TownCity: { type: String, required: true },
        MobileNumber: { type: Number, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        pincode: { type: Number, required: true },
      }
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        productName: String,
        quantity: Number,
        price: Number,
        discountedPrice: Number,
        totalPrice: Number,// total price before applying discount
        status: {
          type: String,
          enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Returned', 'Return Rejected'],
          default: 'Pending'
        },
        returnReason: String,
        returnRequestDate: Date,
        returnProcessedDate: Date
      },
    ],
    payment: {
      paymentMethod: {
        type: String,
        required: true
      },
      paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded'],
        default: 'Pending'
      },
      totalAmount: Number,
      discount: Number,
      grandTotal: Number,
      shippingCost:Number,
      orderTotal:Number, //incl.GST
      couponDiscount: {
        type: Number,
        default: 0
      },
      appliedCouponCode: { type: String,
      },
      refundedAmount: {
        type: Number,
        default: 0
      },
      razorpayOrderId: {
        type: String
      },
      razorpayPaymentId: {
        type: String
      }
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Partially Cancelled'],
      default: 'Pending'
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
