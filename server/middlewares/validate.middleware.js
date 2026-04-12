const { validationResult, body, param, query } = require("express-validator");

// ─── Error Formatter ────────────────────────────────────────────────────────

// Picks up all validation errors and sends a clean response
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

// ─── Auth Validators ─────────────────────────────────────────────────────────

const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ max: 50 }).withMessage("Name cannot exceed 50 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Enter a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/\d/).withMessage("Password must contain at least one number"),

  handleValidationErrors,
];

const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Enter a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

// ─── Expense Validators ───────────────────────────────────────────────────────

const validateCreateExpense = [
  body("amount")
    .notEmpty().withMessage("Amount is required")
    .isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),

  body("category")
    .trim()
    .notEmpty().withMessage("Category is required")
    .isLength({ max: 30 }).withMessage("Category cannot exceed 30 characters"),

  body("subcategory")
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage("Subcategory cannot exceed 30 characters"),

  body("note")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Note cannot exceed 300 characters"),

  body("date")
    .notEmpty().withMessage("Date is required")
    .isISO8601().withMessage("Date must be a valid ISO 8601 date")
    .toDate(),

  body("paymentMethod")
    .optional()
    .isIn(["cash", "upi", "card", "netbanking", "wallet", "other"])
    .withMessage("Invalid payment method"),

  body("tags")
    .optional()
    .isArray().withMessage("Tags must be an array")
    .custom((tags) => tags.every((t) => typeof t === "string"))
    .withMessage("Each tag must be a string"),

  body("isRecurring")
    .optional()
    .isBoolean().withMessage("isRecurring must be true or false"),

  body("recurringInterval")
    .optional()
    .isIn(["daily", "weekly", "monthly", "yearly", null])
    .withMessage("Invalid recurring interval"),

  handleValidationErrors,
];

const validateUpdateExpense = [
  param("id")
    .isMongoId().withMessage("Invalid expense ID"),

  body("amount")
    .optional()
    .isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),

  body("category")
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage("Category cannot exceed 30 characters"),

  body("note")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Note cannot exceed 300 characters"),

  body("date")
    .optional()
    .isISO8601().withMessage("Date must be a valid ISO 8601 date")
    .toDate(),

  body("paymentMethod")
    .optional()
    .isIn(["cash", "upi", "card", "netbanking", "wallet", "other"])
    .withMessage("Invalid payment method"),

  handleValidationErrors,
];

const validateExpenseId = [
  param("id")
    .isMongoId().withMessage("Invalid expense ID"),

  handleValidationErrors,
];

// ─── Query Validators (for filters on GET /expenses) ─────────────────────────

const validateExpenseQuery = [
  query("startDate")
    .optional()
    .isISO8601().withMessage("startDate must be a valid date")
    .toDate(),

  query("endDate")
    .optional()
    .isISO8601().withMessage("endDate must be a valid date")
    .toDate(),

  query("category")
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage("Category filter too long"),

  query("paymentMethod")
    .optional()
    .isIn(["cash", "upi", "card", "netbanking", "wallet", "other"])
    .withMessage("Invalid payment method filter"),

  query("minAmount")
    .optional()
    .isFloat({ min: 0 }).withMessage("minAmount must be a positive number"),

  query("maxAmount")
    .optional()
    .isFloat({ min: 0 }).withMessage("maxAmount must be a positive number"),

  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("sortBy")
    .optional()
    .isIn(["date", "amount", "category", "createdAt"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  handleValidationErrors,
];

// ─── Budget Validators ────────────────────────────────────────────────────────

const validateBudget = [
  // body("category")
  //   .trim()
  //   .notEmpty().withMessage("Category is required"),

  body("amount")
    .notEmpty().withMessage("Budget amount is required")
    .isFloat({ min: 1 }).withMessage("Budget amount must be at least 1"),

  body("period")
    .optional()
    .isIn(["daily", "weekly", "monthly", "yearly"])
    .withMessage("Period must be daily, weekly, monthly, or yearly"),

  handleValidationErrors,
];

// ─── Category Validators ──────────────────────────────────────────────────────

const validateCategory = [
  body("name")
    .trim()
    .notEmpty().withMessage("Category name is required")
    .isLength({ max: 30 }).withMessage("Name cannot exceed 30 characters"),

  body("label")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Label cannot exceed 50 characters"),

  body("icon")
    .optional()
    .trim(),

  body("color")
    .optional()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Color must be a valid hex code e.g. #f97316"),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateExpense,
  validateUpdateExpense,
  validateExpenseId,
  validateExpenseQuery,
  validateBudget,
  validateCategory,
  handleValidationErrors,
};