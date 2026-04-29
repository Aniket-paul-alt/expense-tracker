const Expense = require("../models/expense.model");
const Category = require("../models/category.model");
const Notification = require("../models/notification.model");
const mongoose = require("mongoose");

// ─── Helper: Build Filter Query ──────────────────────────────────────────────

const buildFilterQuery = (userId, queryParams) => {
  const {
    startDate,
    endDate,
    category,
    subcategory,
    paymentMethod,
    minAmount,
    maxAmount,
    search,
    tags,
    isRecurring,
  } = queryParams;

  const filter = { userId };

  // Date range
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      // include the full end day till 23:59:59
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  // Category — support comma-separated multiple e.g. "food,transport"
  if (category) {
    const cats = category.split(",").map((c) => c.trim().toLowerCase());
    filter.category = cats.length === 1 ? cats[0] : { $in: cats };
  }

  // Subcategory filter
  if (subcategory) {
    const subcats = subcategory.split(",").map((c) => c.trim().toLowerCase());
    filter.subcategory = subcats.length === 1 ? subcats[0] : { $in: subcats };
  }

  // Payment method
  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  // Amount range
  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) filter.amount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
  }

  // Tags filter
  if (tags) {
    const tagList = tags.split(",").map((t) => t.trim());
    filter.tags = { $in: tagList };
  }

  // Recurring filter
  if (isRecurring !== undefined) {
    filter.isRecurring = isRecurring === "true";
  }

  // Text search on note field
  if (search) {
    filter.note = { $regex: search.trim(), $options: "i" };
  }

  return filter;
};

// ─── @route   GET /api/expenses ──────────────────────────────────────────────
// ─── @access  Private

const getExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "date",
      order = "desc",
    } = req.query;

    const filter = buildFilterQuery(req.user._id, req.query);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSortFields = ["date", "amount", "category", "createdAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "date";

    // Run query and count in parallel
    const [expenses, totalCount] = await Promise.all([
      Expense.find(filter)
        .sort({ [sortField]: sortOrder, createdAt: sortOrder }) // secondary: creation time as tiebreaker
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // lean() returns plain JS objects — faster than Mongoose docs
      Expense.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    return res.status(200).json({
      success: true,
      data: expenses,
      pagination: {
        totalCount,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (err) {
    console.error("GetExpenses error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses.",
    });
  }
};

// ─── @route   GET /api/expenses/:id ──────────────────────────────────────────
// ─── @access  Private

const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user._id, // ensure user owns this expense
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (err) {
    console.error("GetExpenseById error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense.",
    });
  }
};

// ─── @route   POST /api/expenses ─────────────────────────────────────────────
// ─── @access  Private

const createExpense = async (req, res) => {
  try {
    const {
      amount,
      category,
      subcategory,
      note,
      date,
      paymentMethod,
      tags,
      isRecurring,
      recurringInterval,
    } = req.body;

    const expense = await Expense.create({
      userId: req.user._id,
      amount,
      category: category.toLowerCase().trim(),
      subcategory: subcategory?.toLowerCase().trim() || null,
      note: note?.trim() || "",
      date: new Date(date),
      paymentMethod: paymentMethod || "upi",
      tags: tags || [],
      isRecurring: isRecurring || false,
      recurringInterval: recurringInterval || null,
    });

    // Check if this expense pushes user over their budget for this category
    const budgetAlert = await checkBudgetAlert(
      req.user,
      category,
      expense.date
    );

    // ── Save to Notification History & Fire push notification ────────────────
    if (budgetAlert && req.user.preferences?.budgetAlerts !== false) {
      const emoji = budgetAlert.type === "exceeded" ? "🚨" : "⚠️";
      const title = `${emoji} Budget ${budgetAlert.type === "exceeded" ? "Exceeded" : "Warning"}`;
      
      // Save to database for syncing
      await Notification.create({
        userId: req.user._id,
        type: budgetAlert.type === "exceeded" ? "budget_exceeded" : "budget_warning",
        title: title,
        message: budgetAlert.message,
        category: budgetAlert.category,
        metadata: {
          spent: budgetAlert.spent,
          budget: budgetAlert.budget,
          percentage: budgetAlert.percentage
        }
      });

      // Fire push notification (non-blocking)
      const { sendPushToUser } = require("../utils/sendPush");
      sendPushToUser(req.user._id, {
        title: title,
        body:  budgetAlert.message,
        tag:   `budget-${budgetAlert.category}`,
        url:   "/budget",
      }).catch(() => {}); 
    }

    return res.status(201).json({
      success: true,
      message: "Expense added successfully.",
      data: expense,
      budgetAlert: budgetAlert || null,
    });
  } catch (err) {
    console.error("CreateExpense error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create expense.",
    });
  }
};

// ─── @route   PUT /api/expenses/:id ──────────────────────────────────────────
// ─── @access  Private

const updateExpense = async (req, res) => {
  try {
    const {
      amount,
      category,
      subcategory,
      note,
      date,
      paymentMethod,
      tags,
      isRecurring,
      recurringInterval,
    } = req.body;

    // Build only the fields that were actually sent
    const updates = {};
    if (amount !== undefined) updates.amount = amount;
    if (category !== undefined) updates.category = category.toLowerCase().trim();
    if (subcategory !== undefined) updates.subcategory = subcategory?.toLowerCase().trim() || null;
    if (note !== undefined) updates.note = note.trim();
    if (date !== undefined) updates.date = new Date(date);
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (tags !== undefined) updates.tags = tags;
    if (isRecurring !== undefined) updates.isRecurring = isRecurring;
    if (recurringInterval !== undefined) updates.recurringInterval = recurringInterval;

    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id, // ownership check
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      data: expense,
    });
  } catch (err) {
    console.error("UpdateExpense error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update expense.",
    });
  }
};

// ─── @route   DELETE /api/expenses/:id ───────────────────────────────────────
// ─── @access  Private

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id, // ownership check
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
      data: { _id: expense._id },
    });
  } catch (err) {
    console.error("DeleteExpense error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete expense.",
    });
  }
};

// ─── @route   DELETE /api/expenses/bulk ──────────────────────────────────────
// ─── @access  Private

const deleteBulkExpenses = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide an array of expense IDs to delete.",
      });
    }

    // Validate all are valid mongo IDs
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid expense IDs provided.",
      });
    }

    const result = await Expense.deleteMany({
      _id: { $in: validIds },
      userId: req.user._id, // only delete expenses that belong to this user
    });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} expense(s) deleted.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("DeleteBulkExpenses error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete expenses.",
    });
  }
};

// ─── @route   GET /api/expenses/export ───────────────────────────────────────
// ─── @access  Private

const exportExpenses = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.user._id, req.query);

    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .lean();

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No expenses found for the given filters.",
      });
    }

    // Build CSV manually (no extra library needed)
    const headers = [
      "Date",
      "Amount",
      "Category",
      "Subcategory",
      "Note",
      "Payment Method",
      "Tags",
      "Recurring",
    ];

    const rows = expenses.map((e) => [
      new Date(e.date).toLocaleDateString("en-IN"),
      e.amount.toFixed(2),
      e.category,
      e.subcategory || "",
      `"${(e.note || "").replace(/"/g, '""')}"`, // escape quotes in notes
      e.paymentMethod,
      (e.tags || []).join("|"),
      e.isRecurring ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="expenses-${Date.now()}.csv"`
    );

    return res.status(200).send(csv);
  } catch (err) {
    console.error("ExportExpenses error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export expenses.",
    });
  }
};

// ─── @route   GET /api/expenses/summary ──────────────────────────────────────
// ─── @access  Private
// Quick totals for the current day, week, month — used by Dashboard

const getQuickSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();

    // Date boundaries
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [daily, weekly, monthly, yearly] = await Promise.all([
      Expense.getTotalInRange(userId, startOfDay, new Date()),
      Expense.getTotalInRange(userId, startOfWeek, new Date()),
      Expense.getTotalInRange(userId, startOfMonth, new Date()),
      Expense.getTotalInRange(userId, startOfYear, new Date()),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        daily,
        weekly,
        monthly,
        yearly,
      },
    });
  } catch (err) {
    console.error("GetQuickSummary error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch summary.",
    });
  }
};

// ─── Internal Helper: Budget Alert Check ─────────────────────────────────────
// Called after every createExpense — returns alert object if budget exceeded

const checkBudgetAlert = async (user, category, expenseDate) => {
  try {
    const budget = user.getBudgetForCategory(category);
    if (!budget) return null;

    // Figure out date range based on budget period
    const now = expenseDate || new Date();
    let startDate;

    if (budget.period === "daily") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (budget.period === "weekly") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else if (budget.period === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (budget.period === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const { total } = await Expense.getTotalInRange(
      user._id,
      startDate,
      new Date(),
      category  // ← filter by category so only that category's spend is measured
    );

    const percentage = Math.round((total / budget.amount) * 100);

    if (percentage >= 100) {
      return {
        type: "exceeded",
        category,
        spent: total,
        budget: budget.amount,
        percentage,
        message: `You have exceeded your ${budget.period} budget for ${category}!`,
      };
    }

    if (percentage >= 80) {
      return {
        type: "warning",
        category,
        spent: total,
        budget: budget.amount,
        percentage,
        message: `You have used ${percentage}% of your ${budget.period} budget for ${category}.`,
      };
    }

    return null;
  } catch {
    return null; // budget alert failure should never break expense creation
  }
};

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  deleteBulkExpenses,
  exportExpenses,
  getQuickSummary,
};