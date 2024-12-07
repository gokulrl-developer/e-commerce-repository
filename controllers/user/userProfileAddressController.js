const Address = require("../../models/addressModel");


// -----------GET User Addresses-------------------------
exports.getUserAddresses = async (req, res) => {
    try {
      // Get userId from session
      const userId = req.session.user._id;

      // Fetch addresses for the user
      const addresses = await Address.find({ userId }).sort({ createdAt: -1 });
  
      
      // Render address page with data
      res.render("user/user-address", {
        addresses,
        user: req.session.user,
        error: null,
        success: null,
      });
    } catch (err) {
      console.error("Error in getUserAddresses:", err);
      res.render("user/user-address", {
        addresses: [],
        user: req.session.user,
        error: "Failed to fetch addresses",
        success: null,
      });
    }
  };