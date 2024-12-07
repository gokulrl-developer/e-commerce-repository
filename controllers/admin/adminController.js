exports.postLogin = (req, res) => {
  if (
    process.env.ADMIN_EMAIL === req.body.email &&
    process.env.ADMIN_PASSWORD === req.body.password
  ) {
    req.session.admin = true;
    res.redirect("/admin/dashboard");
  } else {
    return res.render("admin/admin-login", {
      error: "Wrong Admin email or password",
    });
  }
};

exports.logout=(req, res)=>{
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).send("Failed to logout. Please try again.");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("Error in logoutPOST:", error);
    res.status(500).send("Server error during logout.");
  }
};