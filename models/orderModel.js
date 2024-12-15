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
      customerEmail:{
        type:String,
        required:true
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
        quantity: {
          type: Number,
          required: true
        },
        price: {
          type: Number,   // price of one piece before discount
          required: true
        },
        discount: {        //discount percentage of each piece
          type: Number,
          required: true,
        }

      },
    ],
    payment: {
      paymentMethod: {
        type: String,
        required: true
      },
      paymentStatus: {
        type: String,
        enum: ["Pending", "Failed", "Completed"],
        default: "Pending",
        required: true
      },
      subTotalPrice: {
        type: Number, // Updated field for total price after discount 
        required: true
      },
      totalFinalPrice: {
        type: Number, // Updated field for total price after discount 
        required: true
      }
    },
    orderStatus: {
      type: String,
      enum: ["Processing", "Pending", "Delivered", "Shipped", "Cancelled"],
      default: "Processing",
    },
    orderDate: {
      type: Date,
      default: Date.now
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
