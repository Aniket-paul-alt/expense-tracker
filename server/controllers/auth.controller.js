const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Category = require("../models/category.model");
const Expense = require("../models/expense.model");
const PushSubscription = require("../models/pushSubscription.model");

// ─── Helper: Generate JWT ─────────────────────────────────────────────────────

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ─── Helper: Send Token Response ─────────────────────────────────────────────

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

    // Clean user object — remove sensitive fields before sending
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    preferences: user.preferences,
    budgets: user.budgets,
    customSubcategories: user.customSubcategories,
    createdAt: user.createdAt,
  };

  return res.status(statusCode).json({
    success: true,
    token,
    user: userData,
  });
};

// ─── @route   POST /api/auth/register ────────────────────────────────────────
// ─── @access  Public

const register = async (req, res) => {
  try {
    const { name, email, password, currency } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Create user — password hashing happens in User model pre-save hook
    const user = await User.create({
      name,
      email,
      password,
      currency: currency || { code: "INR", symbol: "₹" },
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    // Mongoose duplicate key error (safety net besides our manual check)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Register error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ─── @route   POST /api/auth/login ───────────────────────────────────────────
// ─── @access  Public

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it has select: false in schema
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        // deliberately vague — don't reveal whether email exists
        message: "Invalid email or password.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ─── @route   GET /api/auth/me ────────────────────────────────────────────────
// ─── @access  Private (requires token)

const getMe = async (req, res) => {
  try {
    // req.user is already attached by protect middleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        preferences: user.preferences,
        budgets: user.budgets,
        customSubcategories: user.customSubcategories,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

// ─── @route   PUT /api/auth/update-profile ───────────────────────────────────
// ─── @access  Private

const updateProfile = async (req, res) => {
  try {
    const { name, currency, preferences, customSubcategories } = req.body;

    // Only allow safe fields to be updated here
    const allowedUpdates = {};
    if (name) allowedUpdates.name = name.trim();
    if (currency) allowedUpdates.currency = currency;
    if (preferences) allowedUpdates.preferences = preferences;
    if (customSubcategories) allowedUpdates.customSubcategories = customSubcategories;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        preferences: user.preferences,
        customSubcategories: user.customSubcategories,
      },
    });
  } catch (err) {
    console.error("UpdateProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

// ─── @route   PUT /api/auth/change-password ──────────────────────────────────
// ─── @access  Private

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    // Fetch with password since select: false
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Assign new password — pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("ChangePassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

// ─── @route   DELETE /api/auth/delete-account ────────────────────────────────
// ─── @access  Private

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please confirm your password to delete account.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password.",
      });
    }

    // Delete user, all their expenses, categories, and push subscriptions
    const tasks = [User.findByIdAndDelete(req.user._id)];
    
    if (Expense && typeof Expense.deleteMany === 'function') {
      tasks.push(Expense.deleteMany({ userId: req.user._id }));
    }
    if (Category && typeof Category.deleteMany === 'function') {
      tasks.push(Category.deleteMany({ userId: req.user._id }));
    }
    tasks.push(PushSubscription.deleteMany({ userId: req.user._id }));

    await Promise.all(tasks);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (err) {
    console.error("DeleteAccount error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
};