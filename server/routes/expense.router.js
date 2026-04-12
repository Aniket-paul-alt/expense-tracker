const express = require("express");
const router = express.Router();

const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  deleteBulkExpenses,
  exportExpenses,
  getQuickSummary,
} = require("../controllers/expense.controller.js");

const { protect } = require("../middlewares/auth.middleware.js");
const {
  validateCreateExpense,
  validateUpdateExpense,
  validateExpenseId,
  validateExpenseQuery,
} = require("../middlewares/validate.middleware.js");

// All expense routes are protected
router.use(protect);

// Special routes — must be defined BEFORE /:id routes
router.get("/summary",      getQuickSummary);
router.get("/export",       validateExpenseQuery, exportExpenses);
router.delete("/bulk",      deleteBulkExpenses);

// CRUD
router.get("/",             validateExpenseQuery,  getExpenses);
router.post("/",            validateCreateExpense, createExpense);
router.get("/:id",          validateExpenseId,     getExpenseById);
router.put("/:id",          validateUpdateExpense, updateExpense);
router.delete("/:id",       validateExpenseId,     deleteExpense);

module.exports = router;