const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/auth.controller");

const { protect } = require("../middlewares/auth.middleware");
const {
  validateRegister,
  validateLogin,
} = require("../middlewares/validate.middleware");

// Public routes
router.post("/register", validateRegister, register);
router.post("/login",    validateLogin,    login);

// Private routes
router.get("/me",                protect, getMe);
router.put("/update-profile",    protect, updateProfile);
router.put("/change-password",   protect, changePassword);
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;