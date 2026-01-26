const User = require("../../models/userModel");
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

exports.getUsers = async (req, res) => {
  try {
    const { skip, limit, currentPage } = req.pagination;

    const [users, totalUsers] = await Promise.all([
      User.find().lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    if (!users) {
      return res.render('admin/view-users', {message: Messages.USER_LIST_EMPTY })
    }
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/view-users', { users, currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('admin/admin-error', { statusCode: 500, message: Messages.INTERNAL_SERVER_ERROR })
  }
};
exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: 'Blocked' }, { new: true });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.USER_NOT_FOUND });
    }
    res.status(StatusCodes.OK).json({ message: Messages.USER_BLOCK_SUCCESS });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};
exports.unBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.USER_NOT_FOUND });
    }
    res.status(StatusCodes.OK).json({ message: Messages.USER_UNBLOCK_SUCCESS });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message:Messages.INTERNAL_SERVER_ERROR });
  }
}
