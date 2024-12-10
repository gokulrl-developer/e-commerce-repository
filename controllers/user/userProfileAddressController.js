const Address = require("../../models/addressModel");
const User = require("../../models/userModel");




// -------------GET User Profile Page--------------------
exports.getPersonalInformation = async (req, res) => {
  try {
    

    // Fetch user details
    const user = await User.findById(req.session.user._id).select(
      "name email mobile"
    );

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Render the profile page with the user details
    res.render("user/user-profile", { user });
  } catch (err) {
    console.error("Error rendering profile page:", err);
    res.status(500).send("Error on showing profile page");
  }
};


// -------------POST User Profile Page--------------------
 exports.updatePersonalInformation = async (req, res) => {
  try {
    const { fullName, mobile } = req.body;
   const name=fullName;
    const user = await User.findByIdAndUpdate(
      req.session.user._id,
      { name, mobile },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error updating user details:", err);
    res.status(500).json({ error: "Server Error" });
  }
}; 



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
        //success: null,
      });
    } catch (err) {
      console.error("Error in getUserAddresses:", err);
      res.render("user/user-address", {
        addresses: [],
        user: req.session.user,
        error: "Failed to fetch addresses",
        //success: null,
      });
    }
  };

  // -----------Add New Address-------------------------
exports.addAddress = async (req, res) => {
  try {

    const userId = req.session.user._id;

    const requiredFields = [
      "Name",
      "HouseName",
      "LocalityStreet",
      "TownCity",
      "MobileNumber",
      "state",
      "country",
      "pincode",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          error: `${field} is required`,
        });
      }
    }

    if (!/^\d{10}$/.test(req.body.MobileNumber)){
      return res.status(400).json({
        error: "Mobile number must be 10 digits",
      });
    }

    if (!/^\d{6}$/.test(req.body.pincode)) {
      return res.status(400).json({
        error: "Pincode must be 6 digits",
      });
    }
const address = new Address({
  userId,
  Name: req.body.Name,
  HouseName: req.body.HouseName,
  LocalityStreet: req.body.LocalityStreet,
  TownCity: req.body.TownCity,
  MobileNumber: Number(req.body.MobileNumber),
  state: req.body.state,
  country: req.body.country,
  pincode: Number(req.body.pincode),
});

    await address.save();

    res.status(201).json({
      message: "Address added successfully",
      address,
    });
  } catch (err) {
    console.error("Error in addAddress:", err);
    res.status(500).json({
      error: "Failed to add address",
      details: err.message,
    });
  }
};


// Fetch a single address by ID
exports.getEditAddress = async (req, res) => {
  try {
      const { id } = req.params; // Extract address ID from the route
      const address = await Address.findById(id);

      if (!address) {
          return res.status(404).json({ error: 'Address not found' });
      }

      res.status(200).json(address); // Return address as JSON for the modal
  } catch (err) {
      console.error('Error fetching address:', err);
      res.status(500).json({ error: 'Failed to fetch address' });
  }
};

// Update the address
exports.updateAddress = async (req, res) => {
  try {
    console.log("dflaksdfsjk")
    console.log(req.params);

      const { id } = req.params; // Extract address ID from the route
      console.log(id);

      const updatedData = req.body; // Data from the modal form
       console.log(id);
       const userId = req.session.user._id;

      const updatedAddress = await Address.findByIdAndUpdate(
          id,
          updatedData,
          { new: true } // Return the updated document
      );

      if (!updatedAddress) {
          return res.status(404).json({ error: 'Address not found' });
      }

      res.status(200).json({ message: 'Address updated successfully', address: updatedAddress });
  } catch (err) {
      console.error('Error updating address:', err);
      res.status(500).json({ error: 'Failed to update address' });
  }
};

// -----------Delete address-------------------------
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Address.findByIdAndDelete(id);

    if (result) {
      res.status(200).json({ message: "Address deleted successfully" });
    } else {
      res.status(404).json({ error: "Address not found" });
    }
  } catch (err) {
    console.error("Error deleting address:", err);
    res.status(500).json({ error: "Server error on deleting Address." });
  }
};