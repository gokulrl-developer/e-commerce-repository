const Category = require("../../models/categoryModel");
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

exports.getCategories = async (req, res) => {
  try {
    const { skip, limit, currentPage } = req.pagination;

    const [categories, totalCategories] = await Promise.all([
      Category.find().lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Category.countDocuments(),
    ]);
    categories.forEach((category, i) => {
      category.index = i;
      const date = category.createdAt;
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      category.createdDate = formattedDate;
    })
    const totalPages = Math.ceil(totalCategories / limit);

    res.render('admin/view-categories', { categories, currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching categories:', error);
   res.render('admin/admin-error',{statusCode:StatusCodes.INTERNAL_SERVER_ERROR,message:Messages.INTERNAL_SERVER_ERROR})
  }
};

exports.addCategory = async (req, res) => {
  try {
    const { categoryName, status } = req.body;
  if (!categoryName || typeof categoryName !=="string" || categoryName.length<3 || categoryName.length>50 || /^[A-Za-z0-9]+$/.test(categoryName) !==true){
    return res.status(StatusCodes.VALIDATION_ERROR).json({message:Messages.CATEGORY_INVALID_FORMAT})
  }
    if (!status || !["Active","Inactive"].includes(status)) {
      return res.status(StatusCodes.VALIDATION_ERROR).json({ message: Messages.STATUS_INVALID });
    }

    const categoryExists = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
    if (categoryExists) {
      return res.status(StatusCodes.VALIDATION_ERROR).json({message: Messages.CATEGORY_EXISTS });
    }

    const newCategory = new Category({ categoryName, status });
    await newCategory.save();

    res.status(StatusCodes.CREATED).json({message: Messages.CATEGORY_ADDITION_SUCCESS });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: Messages.INTERNAL_SERVER_ERROR });
  }
};

exports.editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, status } = req.body;

    if (!categoryName || typeof categoryName !=="string" || categoryName.length<3 || categoryName.length>50 || /^[A-Za-z0-9]+$/.test(categoryName) !==true){
      return res.status(StatusCodes.VALIDATION_ERROR).json({message: Messages.CATEGORY_INVALID_FORMAT})
    }
      if (!status || !["Active","Inactive"].includes(status)) {
        return res.status(StatusCodes.VALIDATION_ERROR).json({ message: Messages.STATUS_INVALID });
      }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({message: Messages.CATEGORY_NOT_FOUND });
    }

    const categoryExists = await Category.findOne({
      _id: { $ne: id },
      categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    });
    if (categoryExists) {
      return res.status(StatusCodes.VALIDATION_ERROR).json({message: Messages.CATEGORY_EXISTS });
    }

    category.categoryName = categoryName;
    category.status = status;
    await category.save();

    res.status(StatusCodes.OK).json({ message: Messages.CATEGORY_UPDATED });
  } catch (error) {
    console.error("Error editing category:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};

exports.softDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: Messages.CATEGORY_NOT_FOUND });
    }

    category.status = 'Inactive';
    await category.save();

    res.json({ message: Messages.CATEGORY_DEACTIVATED });
  } catch (err) {
    console.error("Error deactivating category:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};