const User = require("../../models/userModel");

exports.getUsers = async (req, res) => {
  try {
    const { skip, limit, currentPage } = req.pagination;

    const [users, totalUsers] = await Promise.all([
      User.find().lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    
    const totalPages = Math.ceil(totalUsers / limit);
    
    res.render('admin/view-users', { users,currentPage,totalPages });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send('Internal Server Error');
  }
};
