const Category = require("../../models/categoryModel");

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
   res.render('admin/admin-error',{statusCode:500,message:"Server Error on showing Categories"})
  }
};

exports.addCategory = async (req, res) => {
  try {
    const { categoryName, status } = req.body;
  if (!categoryName || typeof categoryName !=="string" || categoryName.length<3 || categoryName.length>50 || /^[A-Za-z0-9]+$/.test(categoryName) !==true){
    return res.status(400).json({message:"Category must be a string with 3 to 50 characters containing numbers/letters"})
  }
    if (!status || !["Active","Inactive"].includes(status)) {
      return res.status(400).json({ message: "Status is required and must be a Active/Inactive" });
    }

    const categoryExists = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
    if (categoryExists) {
      return res.status(400).json({message: "Category already exists" });
    }

    const newCategory = new Category({ categoryName, status });
    await newCategory.save();

    res.status(201).json({message: "Category added successfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({message: "Internal Server Error" });
  }
};

exports.editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, status } = req.body;

    if (!categoryName || typeof categoryName !=="string" || categoryName.length<3 || categoryName.length>50 || /^[A-Za-z0-9]+$/.test(categoryName) !==true){
      return res.status(400).json({message:"Category must be a string with 3 to 50 characters containing numbers/letters"})
    }
      if (!status || !["Active","Inactive"].includes(status)) {
        return res.status(400).json({ message: "Status is required and must be a Active/Inactive" });
      }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({message: "Category not found" });
    }

    const categoryExists = await Category.findOne({
      _id: { $ne: id },
      categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    });
    if (categoryExists) {
      return res.status(400).json({message: "Category name already exists" });
    }

    category.categoryName = categoryName;
    category.status = status;
    await category.save();

    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error editing category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.softDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.status = 'Inactive';
    await category.save();

    res.json({ message: 'Category has been successfully deactivated.' });
  } catch (err) {
    console.error("Error deactivating category:", err);
    res.status(500).json({ message: 'Failed to deactivate category.' });
  }
};