const Address = require("../../models/addressModel");
const User = require("../../models/userModel");
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")



// -------------GET User Profile Page--------------------
exports.getPersonalInformation = async (req, res) => {
  try {
    

    // Fetch user details
    const user = await User.findById(req.session.user._id).select(
      "name email mobile"
    );

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).send(Messages.USER_NOT_FOUND);
    }

    // Render the profile page with the user details
    res.render("user/user-profile", { user });
  } catch (err) {
    console.error("Error rendering profile page:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(Messages.INTERNAL_SERVER_ERROR);
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
      return res.status(StatusCodes.NOT_FOUND).json({ error: Messages.USER_NOT_FOUND });
    }

    res.status(StatusCodes.OK).json({ message:Messages.PROFILE_UPDATED , user });
  } catch (err) {
    console.error("Error updating user details:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR });
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
        error: Messages.INTERNAL_SERVER_ERROR,
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
        return res.status(StatusCodes.VALIDATION_ERROR).json({
          error: Messages.ADDRESS_FIELD_REQUIRED(field),
        });
      }
    }

    if (!/^\d{10}$/.test(req.body.MobileNumber)){
      return res.status(StatusCodes.VALIDATION_ERROR).json({
        error: Messages.MOBILE_NUMBER_INVALID_FORMAT,
      });
    }

    if (!/^\d{6}$/.test(req.body.pincode)) {
      return res.status(StatusCodes.VALIDATION_ERROR).json({
        error: Messages.PIN_NUMBER_INVALID_FORMAT,
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

    res.status(StatusCodes.CREATED).json({
      message: Messages.ADDRESS_ADDED,
      address,
    });
  } catch (err) {
    console.error("Error in addAddress:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: Messages.INTERNAL_SERVER_ERROR,
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
          return res.status(StatusCodes.NOT_FOUND).json({ error: Messages.ADDRESS_NOT_FOUNT });
      }

      res.status(StatusCodes.OK).json(address); // Return address as JSON for the modal
  } catch (err) {
      console.error('Error fetching address:', err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
};

// Update the address
exports.updateAddress = async (req, res) => {
  try {
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
          return res.status(StatusCodes.NOT_FOUND).json({ error: Messages.ADDRESS_NOT_FOUNT });
      }

      res.status(StatusCodes.OK).json({ message: Messages.ADDRESS_UPDATED, address: updatedAddress });
  } catch (err) {
      console.error('Error updating address:', err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
};

// -----------Delete address-------------------------
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Address.findByIdAndDelete(id);

    if (result) {
      res.status(StatusCodes.OK).json({ message: Messages.ADDRESS_DELETED});
    } else {
      res.status(StatusCodes.NOT_FOUND).json({ error: Messages.ADDRESS_NOT_FOUNT });
    }
  } catch (err) {
    console.error("Error deleting address:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
};