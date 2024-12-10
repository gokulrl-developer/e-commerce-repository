const mongoose = require("mongoose");
const Cart = require("../../models/cartModel");

exports.addToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "User not logged in" });
    }
    const { productId,quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const userId = req.session.user._id;

    let cartItem = await Cart.findOne({
      userId,
      productId,
    });

    if (cartItem) {
      return res
        .status(200)
        .json({ message: "Product is already in the cart." });
    } else {
      cartItem = new Cart({
        userId,
        productId,
        quantity,
      });
      await cartItem.save();
      res.status(200).json({ message: "Item added to cart successfully." });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};


 exports.getCart = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const cartItems = await Cart.find({ userId })
      .populate("productId")

    let subtotal = 0;
    let totalDiscount = 0;

    const formattedCartItems = cartItems.map((item) => {
      const product = item.productId;
      const discountPrice = product.discountPrice;
      subtotal += discountPrice * item.quantity;
      totalDiscount += (product.price-product.discountPrice) * item.quantity;

      return {
        _id: item._id,
        product,
        quantity:item.quantity,
        totalPrice:item.quantity*discountPrice
      };
    });
    const totalDiscountedPrice = subtotal + totalDiscount;
  
    res.render("user/cart", {
      cartItems: formattedCartItems,
      subtotal,
      totalDiscount,
      totalDiscountedPrice
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).send("Server Error");
  }
}; 



 exports.deleteFromCart = async (req, res) => {
  try {
    const cartItemId = req.params.id;
    const userId = req.session.user._id;

    const result = await Cart.findOneAndDelete({ _id: cartItemId, userId });

    if (result) {
      res.status(200).json({ message: "Item removed from cart" });
    } else {
      res.status(404).json({ message: "Item not found in cart" });
    }
  } catch (error) {
    console.error("Error deleting cart item:", error);
    res.status(500).json({ message: "Server Error" });
  }
}; 

 exports.updateCartQuantity = async (req, res) => {
  try {
    const cartItemId = req.params.id; // ID of the cart item
    const { quantity } = req.body; // New quantity from the client
    const userId = req.session.user._id; // Current user ID

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    } else if (quantity > 5) {
      return res
        .status(400)
        .json({ message: "Maximum quantity of 5 is allowed" });
    }

    // Find the cart item
    const cartItem = await Cart.findOne({ _id: cartItemId, userId }).populate(
      "productId"
    );

    if (!cartItem) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Check the product stock
    const product = cartItem.productId; 
    if (product.stock < quantity) {
      return res
        .status(400)
        .json({ message: `Only ${product.stock} items left in stock` });
    }

    // Update the quantity
    cartItem.quantity = quantity;
    await cartItem.save();
    res.status(200).json({ message: "Cart updated successfully", cartItem });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ message: "Server Error" });
  }
}; 

