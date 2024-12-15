const mongoose = require("mongoose");
const Cart = require("../../models/cartModel");
const Product = require("../../models/productModel");

exports.addToCart = async (req, res) => {
  try {

    const userId = req.session.user?._id;
    if (!req.session.user) {
      return res.status(401).json({ message: "User not logged in" });
    }
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid product or quantity.' });
  }

  const product = await Product.findById(productId);

  if (!product || product.stock < quantity) {
      return res.status(400).json({ message: 'Product not available in the required quantity.' });
  }

  let cart = await Cart.findOne({ userId });

  if (!cart) {
      cart = new Cart({ userId, items: [] });
  }
  const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
            const currentQuantity = cart.items[itemIndex].quantity;
            const newQuantity = currentQuantity + quantity;

            if (newQuantity > 5) {
                return res.status(400).json({ status: 'error', message: 'You cannot add more than 5 units of this product.' });
            }

            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].price = product.discountPrice || product.price;
        } else {
            if (quantity > 5) {
                return res.status(400).json({ status: 'error', message: 'You cannot add more than 5 units of a product to your cart.' });
            }
            cart.items.push({
                product: productId,
                quantity
            });
        }
    await cart.save();
    res.status(200).json({ message: "Item added to cart successfully." });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};


exports.getCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const cart = await Cart.findOne({ userId })
      .populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.render('user/cart', {
        cartItems: [],
        subtotal: 0,
        totalDiscount: 0,
        totalDiscountedPrice: 0
      });
    }

    let subtotal = 0;
    let totalDiscount = 0;

    const formattedCartItems = cart.items.map((item) => {
      const product = item.product;
      const discountPrice = product.discountPrice;
      subtotal += discountPrice * item.quantity;
      totalDiscount += (product.price - product.discountPrice) * item.quantity;

      return {
        _id: item.product._id,
        product,
        quantity: item.quantity,
        totalPrice: item.quantity * discountPrice
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
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not logged in.' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(400).json({ message: 'Cart not found.' });
    }
    if (cart.items.length === 0) {
      await Cart.findOneAndDelete({ userId });
      return res.status(200).json({ status: 'success', message: 'Product removed from cart.', isEmpty: true });
    } else {
      cart.items = cart.items.filter((item) => item.product.toString() !== cartItemId);
      await cart.save();
      res.status(200).json({ message: "Item removed from cart" });
    }
  } catch (error) {
    console.error("Error deleting cart item:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateCartQuantity = async (req, res) => {
  try {

    const { quantity, productId } = req.body; // New quantity from the client
    const userId = req.session.user?._id; // Current user ID
    if (!userId) {
      return res.status(401).json({ message: 'User not logged in.' });
    }

    if (!productId || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid product or quantity.' });
    }
    if (quantity > 5) {
      return res.status(400).json({ message: 'You cannot have more than 5 units of a product in your cart.' });
    }

    // Check the product stock
    const product = await Product.findById(productId);
    if (!product || product.stock < quantity) {
      return res.status(400).json({ message: 'Not enough stock available.' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(400).json({ message: 'Cart not found.' });
    }

    const item = cart.items.find(item => item.product.toString() === productId);
    if (item) {
      item.quantity = quantity;
      await cart.save();
      res.status(200).json({ message: 'Quantity updated successfully!' });
    } else {
      res.status(400).json({ message: 'Product not found in cart.' });
    }
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ message: error.message || "Server Error while updating cart item number" });
  }
};

