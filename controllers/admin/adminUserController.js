const User = require("../../models/userModel");

exports.getUsers = async (req, res) => {
  try {
    const { skip, limit, currentPage } = req.pagination;

    const [users, totalUsers] = await Promise.all([
      User.find().lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    if (!users) {
      return res.render('admin/admin-error', { statusCode: 404, message: "no users to show" })
    }
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/view-users', { users, currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.render('admin/admin-error', { statusCode: 500, message: "error on retrieving users" })
  }
};
exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: 'Blocked' }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: 'User has been successfully blocked.' });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ message: 'Failed to block user.' });
  }
};
exports.unBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: 'User has been successfully blocked.' });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ message: 'Failed to block user.' });
  }
}
