const express = require("express");
const router = express.Router();

const {
  getAllBudgets,
  getBudgetByCategory,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetAlerts,
  resetAllBudgets,
} = require("../controllers/budget.controller.js");

const { protect } = require("../middlewares/auth.middleware.js");
const { validateBudget } = require("../middlewares/validate.middleware.js");

router.use(protect);

// Special routes — before /:category
router.get("/alerts",       getBudgetAlerts);
router.post("/reset",       resetAllBudgets);

// CRUD
router.get("/",             getAllBudgets);
router.post("/",            validateBudget, createBudget);
router.get("/:category",    getBudgetByCategory);
router.put("/:category",    validateBudget, updateBudget);
router.delete("/:category", deleteBudget);

module.exports = router;