const User = require("../models/user.model.js");
const Expense = require("../models/expense.model.js");
const mongoose = require("mongoose");

// ─── Helper: Get date range for a budget period ───────────────────────────────

const getPeriodRange = (period) => {
  const now = new Date();

  switch (period) {
    case "daily": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "weekly": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "monthly": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "yearly": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }
};

// ─── Helper: Calculate spent amount for a category in a period ────────────────

const getSpentAmount = async (userId, category, period) => {
  const { start, end } = getPeriodRange(period);

  const result = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        category: category.toLowerCase(),
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    spent: result[0]?.total || 0,
    count: result[0]?.count || 0,
    periodStart: start,
    periodEnd: end,
  };
};

// ─── @route   GET /api/budget ─────────────────────────────────────────────────
// ─── @access  Private
// Returns all budgets with real-time spent amount and status for each

const getAllBudgets = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.budgets || user.budgets.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No budgets set yet.",
      });
    }

    // Fetch spent amounts for all budgets in parallel
    const budgetsWithProgress = await Promise.all(
      user.budgets.map(async (budget) => {
        const { spent, count, periodStart, periodEnd } =
          await getSpentAmount(req.user._id, budget.category, budget.period);

        const percentage = Math.min(
          Math.round((spent / budget.amount) * 100),
          100
        );

        const remaining = Math.max(budget.amount - spent, 0);

        let status = "safe";
        if (percentage >= 100) status = "exceeded";
        else if (percentage >= 80) status = "warning";

        return {
          _id: budget._id,
          category: budget.category,
          budgetAmount: budget.amount,
          period: budget.period,
          spent,
          remaining,
          percentage,
          count,
          status,
          periodStart,
          periodEnd,
        };
      })
    );

    // Sort — exceeded first, then warning, then safe
    const statusOrder = { exceeded: 0, warning: 1, safe: 2 };
    budgetsWithProgress.sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    );

    return res.status(200).json({
      success: true,
      count: budgetsWithProgress.length,
      data: budgetsWithProgress,
    });
  } catch (err) {
    console.error("GetAllBudgets error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch budgets.",
    });
  }
};

// ─── @route   GET /api/budget/:category ──────────────────────────────────────
// ─── @access  Private

const getBudgetByCategory = async (req, res) => {
  try {
    const category = req.params.category.toLowerCase().trim();
    const user = await User.findById(req.user._id);

    const budget = user.budgets.find(
      (b) => b.category.toLowerCase() === category
    );

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: `No budget set for category: ${category}`,
      });
    }

    const { spent, count, periodStart, periodEnd } = await getSpentAmount(
      req.user._id,
      category,
      budget.period
    );

    const percentage = Math.min(
      Math.round((spent / budget.amount) * 100),
      100
    );

    return res.status(200).json({
      success: true,
      data: {
        _id: budget._id,
        category: budget.category,
        budgetAmount: budget.amount,
        period: budget.period,
        spent,
        remaining: Math.max(budget.amount - spent, 0),
        percentage,
        count,
        status:
          percentage >= 100
            ? "exceeded"
            : percentage >= 80
            ? "warning"
            : "safe",
        periodStart,
        periodEnd,
      },
    });
  } catch (err) {
    console.error("GetBudgetByCategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch budget.",
    });
  }
};

// ─── @route   POST /api/budget ────────────────────────────────────────────────
// ─── @access  Private
// Add a new budget — one budget per category rule enforced here

const createBudget = async (req, res) => {
  try {
    const { category, amount, period = "monthly" } = req.body;
    const normalizedCategory = category.toLowerCase().trim();

    const user = await User.findById(req.user._id);

    // Check if budget already exists for this category
    const exists = user.budgets.find(
      (b) => b.category.toLowerCase() === normalizedCategory
    );

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `A budget for "${normalizedCategory}" already exists. Use PUT to update it.`,
      });
    }

    user.budgets.push({
      category: normalizedCategory,
      amount,
      period,
    });

    await user.save();

    const newBudget = user.budgets[user.budgets.length - 1];

    return res.status(201).json({
      success: true,
      message: "Budget created successfully.",
      data: newBudget,
    });
  } catch (err) {
    console.error("CreateBudget error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create budget.",
    });
  }
};

// ─── @route   PUT /api/budget/:category ──────────────────────────────────────
// ─── @access  Private

const updateBudget = async (req, res) => {
  try {
    const category = req.params.category.toLowerCase().trim();
    const { amount, period } = req.body;

    const user = await User.findById(req.user._id);

    const budgetIndex = user.budgets.findIndex(
      (b) => b.category.toLowerCase() === category
    );

    if (budgetIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `No budget found for category: ${category}`,
      });
    }

    // Only update fields that were sent
    if (amount !== undefined) user.budgets[budgetIndex].amount = amount;
    if (period !== undefined) user.budgets[budgetIndex].period = period;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Budget updated successfully.",
      data: user.budgets[budgetIndex],
    });
  } catch (err) {
    console.error("UpdateBudget error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update budget.",
    });
  }
};

// ─── @route   DELETE /api/budget/:category ───────────────────────────────────
// ─── @access  Private

const deleteBudget = async (req, res) => {
  try {
    const category = req.params.category.toLowerCase().trim();

    const user = await User.findById(req.user._id);

    const budgetExists = user.budgets.find(
      (b) => b.category.toLowerCase() === category
    );

    if (!budgetExists) {
      return res.status(404).json({
        success: false,
        message: `No budget found for category: ${category}`,
      });
    }

    // Pull the budget subdocument out of the array
    user.budgets = user.budgets.filter(
      (b) => b.category.toLowerCase() !== category
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Budget for "${category}" deleted successfully.`,
    });
  } catch (err) {
    console.error("DeleteBudget error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete budget.",
    });
  }
};

// ─── @route   GET /api/budget/alerts ─────────────────────────────────────────
// ─── @access  Private
// Returns only the budgets that are at warning or exceeded status

const getBudgetAlerts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.budgets || user.budgets.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const allBudgets = await Promise.all(
      user.budgets.map(async (budget) => {
        const { spent, periodStart, periodEnd } = await getSpentAmount(
          req.user._id,
          budget.category,
          budget.period
        );
        const percentage = Math.round((spent / budget.amount) * 100);

        return {
          category: budget.category,
          budgetAmount: budget.amount,
          period: budget.period,
          spent,
          percentage,
          remaining: Math.max(budget.amount - spent, 0),
          status:
            percentage >= 100
              ? "exceeded"
              : percentage >= 80
              ? "warning"
              : "safe",
          periodStart,
          periodEnd,
        };
      })
    );

    // Return only budgets that need attention
    const alerts = allBudgets.filter((b) => b.status !== "safe");

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    console.error("GetBudgetAlerts error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch budget alerts.",
    });
  }
};

// ─── @route   POST /api/budget/reset ─────────────────────────────────────────
// ─── @access  Private
// Deletes all budgets for the user — useful for settings reset

const resetAllBudgets = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { budgets: [] },
    });

    return res.status(200).json({
      success: true,
      message: "All budgets have been reset.",
    });
  } catch (err) {
    console.error("ResetAllBudgets error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reset budgets.",
    });
  }
};

module.exports = {
  getAllBudgets,
  getBudgetByCategory,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetAlerts,
  resetAllBudgets,
};