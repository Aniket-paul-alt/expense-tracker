const Expense = require("../models/expense.model.js");
const mongoose = require("mongoose");
const {
  getDateRanges,
  totalInRangePipeline,
  categoryBreakdownPipeline,
  dailyTrendPipeline,
  weeklyBreakdownPipeline,
  monthlyBreakdownPipeline,
  yearlyBreakdownPipeline,
  topExpensesPipeline,
  paymentMethodPipeline,
  comparePeriodsPipeline,
} = require("../utils/aggregation.js");

// ─── Helper: Fill missing days with zero ─────────────────────────────────────
// MongoDB only returns days that have data — this fills the gaps

const fillMissingDays = (data, startDate, endDate) => {
  const result = [];
  const dataMap = {};

  data.forEach((d) => (dataMap[d.date] = d));

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;

    result.push(
      dataMap[key] || { date: key, total: 0, count: 0 }
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};

// ─── Helper: Fill missing months with zero ───────────────────────────────────

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fillMissingMonths = (data, totalMonths = 12) => {
  const dataMap = {};
  data.forEach((d) => (dataMap[d.month] = d));

  return Array.from({ length: totalMonths }, (_, i) => {
    const month = i + 1;
    return dataMap[month] || {
      month,
      monthName: MONTH_NAMES[month],
      total: 0,
      count: 0,
    };
  });
};

// ─── Helper: Fill missing weekdays with zero ──────────────────────────────────

const DAY_NAMES = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fillMissingDays7 = (data) => {
  const dataMap = {};
  data.forEach((d) => (dataMap[d.dayOfWeek] = d));

  return Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    return dataMap[day] || {
      dayOfWeek: day,
      dayName: DAY_NAMES[day],
      total: 0,
      count: 0,
    };
  });
};

// ─── @route   GET /api/analytics/overview ────────────────────────────────────
// ─── @access  Private
// Returns everything the dashboard needs in one single request

const getOverview = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      startOfDay, endOfDay,
      startOfWeek, endOfWeek,
      startOfMonth, endOfMonth,
      startOfYear, endOfYear,
      last7Days, now,
    } = getDateRanges();

    // Run all aggregations in parallel — much faster than sequential
    const [
      dailySummary,
      weeklySummary,
      monthlySummary,
      yearlySummary,
      monthlyCategories,
      last7DaysTrend,
      topExpensesThisMonth,
      paymentMethods,
    ] = await Promise.all([
      Expense.aggregate(totalInRangePipeline(userId, startOfDay, endOfDay)),
      Expense.aggregate(totalInRangePipeline(userId, startOfWeek, endOfWeek)),
      Expense.aggregate(totalInRangePipeline(userId, startOfMonth, endOfMonth)),
      Expense.aggregate(totalInRangePipeline(userId, startOfYear, endOfYear)),
      Expense.aggregate(categoryBreakdownPipeline(userId, startOfMonth, endOfMonth)),
      Expense.aggregate(dailyTrendPipeline(userId, last7Days, now)),
      Expense.aggregate(topExpensesPipeline(userId, startOfMonth, endOfMonth, 5)),
      Expense.aggregate(paymentMethodPipeline(userId, startOfMonth, endOfMonth)),
    ]);

    // Fill zeros for days with no expenses
    const trendWithZeros = fillMissingDays(last7DaysTrend, last7Days, now);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          daily:   dailySummary[0]   || { total: 0, count: 0 },
          weekly:  weeklySummary[0]  || { total: 0, count: 0 },
          monthly: monthlySummary[0] || { total: 0, count: 0 },
          yearly:  yearlySummary[0]  || { total: 0, count: 0 },
        },
        categoryBreakdown: monthlyCategories,
        last7DaysTrend: trendWithZeros,
        topExpenses: topExpensesThisMonth,
        paymentMethods,
      },
    });
  } catch (err) {
    console.error("GetOverview error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics overview.",
    });
  }
};

// ─── @route   GET /api/analytics/daily ───────────────────────────────────────
// ─── @access  Private
// Detailed daily view — accepts ?date=YYYY-MM-DD or defaults to today

const getDailyAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetDate = req.query.date
      ? new Date(req.query.date)
      : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [summary, categoryBreakdown, hourlyBreakdown, topExpenses] =
      await Promise.all([
        Expense.aggregate(totalInRangePipeline(userId, startOfDay, endOfDay)),
        Expense.aggregate(categoryBreakdownPipeline(userId, startOfDay, endOfDay)),

        // Hourly distribution — where in the day do you spend most?
        Expense.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              date: { $gte: startOfDay, $lte: endOfDay },
            },
          },
          {
            $group: {
              _id: { $hour: "$date" },
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              hour: "$_id",
              total: 1,
              count: 1,
            },
          },
        ]),

        Expense.aggregate(topExpensesPipeline(userId, startOfDay, endOfDay, 3)),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        date: targetDate.toISOString().split("T")[0],
        summary: summary[0] || { total: 0, count: 0 },
        categoryBreakdown,
        hourlyBreakdown,
        topExpenses,
      },
    });
  } catch (err) {
    console.error("GetDailyAnalytics error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch daily analytics.",
    });
  }
};

// ─── @route   GET /api/analytics/weekly ──────────────────────────────────────
// ─── @access  Private
// Accepts ?startDate=YYYY-MM-DD or defaults to current week

const getWeeklyAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startOfWeek, endOfWeek } = getDateRanges();

    const weekStart = req.query.startDate
      ? new Date(req.query.startDate)
      : startOfWeek;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [summary, categoryBreakdown, dailyBreakdown, paymentMethods] =
      await Promise.all([
        Expense.aggregate(totalInRangePipeline(userId, weekStart, weekEnd)),
        Expense.aggregate(categoryBreakdownPipeline(userId, weekStart, weekEnd)),
        Expense.aggregate(weeklyBreakdownPipeline(userId, weekStart, weekEnd)),
        Expense.aggregate(paymentMethodPipeline(userId, weekStart, weekEnd)),
      ]);

    // Fill all 7 days even if no spending
    const dailyWithZeros = fillMissingDays7(dailyBreakdown);

    return res.status(200).json({
      success: true,
      data: {
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd:   weekEnd.toISOString().split("T")[0],
        summary: summary[0] || { total: 0, count: 0 },
        categoryBreakdown,
        dailyBreakdown: dailyWithZeros,
        paymentMethods,
      },
    });
  } catch (err) {
    console.error("GetWeeklyAnalytics error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly analytics.",
    });
  }
};

// ─── @route   GET /api/analytics/monthly ─────────────────────────────────────
// ─── @access  Private
// Accepts ?month=1-12&year=YYYY or defaults to current month

const getMonthlyAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0, 23, 59, 59, 999);

    // Previous month for comparison
    const prevMonthStart = new Date(year, month - 2, 1);
    const prevMonthEnd   = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const [
      summary,
      categoryBreakdown,
      dailyTrend,
      paymentMethods,
      topExpenses,
      comparison,
    ] = await Promise.all([
      Expense.aggregate(totalInRangePipeline(userId, monthStart, monthEnd)),
      Expense.aggregate(categoryBreakdownPipeline(userId, monthStart, monthEnd)),
      Expense.aggregate(dailyTrendPipeline(userId, monthStart, monthEnd)),
      Expense.aggregate(paymentMethodPipeline(userId, monthStart, monthEnd)),
      Expense.aggregate(topExpensesPipeline(userId, monthStart, monthEnd, 5)),
      Expense.aggregate(
        comparePeriodsPipeline(userId, monthStart, monthEnd, prevMonthStart, prevMonthEnd)
      ),
    ]);

    const dailyWithZeros = fillMissingDays(dailyTrend, monthStart, monthEnd);

    // Format comparison result
    const comparisonMap = {};
    comparison.forEach((c) => (comparisonMap[c.period] = c));

    const currentTotal  = comparisonMap.current?.total  || 0;
    const previousTotal = comparisonMap.previous?.total || 0;
    const changePercent = previousTotal === 0
      ? null
      : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);

    return res.status(200).json({
      success: true,
      data: {
        month,
        year,
        monthName: MONTH_NAMES[month],
        summary: summary[0] || { total: 0, count: 0 },
        categoryBreakdown,
        dailyTrend: dailyWithZeros,
        paymentMethods,
        topExpenses,
        comparison: {
          currentTotal,
          previousTotal,
          changePercent,        // positive = spent more, negative = spent less
          trend: changePercent === null
            ? "no-data"
            : changePercent > 0 ? "up" : changePercent < 0 ? "down" : "same",
        },
      },
    });
  } catch (err) {
    console.error("GetMonthlyAnalytics error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly analytics.",
    });
  }
};

// ─── @route   GET /api/analytics/yearly ──────────────────────────────────────
// ─── @access  Private
// Accepts ?year=YYYY or defaults to current year

const getYearlyAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31, 23, 59, 59, 999);

    // Previous year for comparison
    const prevYearStart = new Date(year - 1, 0, 1);
    const prevYearEnd   = new Date(year - 1, 11, 31, 23, 59, 59, 999);

    const [
      summary,
      monthlyBreakdown,
      categoryBreakdown,
      topExpenses,
      paymentMethods,
      yearComparison,
    ] = await Promise.all([
      Expense.aggregate(totalInRangePipeline(userId, yearStart, yearEnd)),
      Expense.aggregate(yearlyBreakdownPipeline(userId, year)),
      Expense.aggregate(categoryBreakdownPipeline(userId, yearStart, yearEnd)),
      Expense.aggregate(topExpensesPipeline(userId, yearStart, yearEnd, 10)),
      Expense.aggregate(paymentMethodPipeline(userId, yearStart, yearEnd)),
      Expense.aggregate(
        comparePeriodsPipeline(userId, yearStart, yearEnd, prevYearStart, prevYearEnd)
      ),
    ]);

    // Fill all 12 months even if some have no spending
    const monthlyWithZeros = fillMissingMonths(monthlyBreakdown, 12);

    // Format comparison
    const compMap = {};
    yearComparison.forEach((c) => (compMap[c.period] = c));

    const currentTotal  = compMap.current?.total  || 0;
    const previousTotal = compMap.previous?.total || 0;
    const changePercent = previousTotal === 0
      ? null
      : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);

    // Find the highest spending month
    const peakMonth = monthlyWithZeros.reduce(
      (max, m) => (m.total > max.total ? m : max),
      { total: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        year,
        summary: summary[0] || { total: 0, count: 0 },
        monthlyBreakdown: monthlyWithZeros,
        categoryBreakdown,
        topExpenses,
        paymentMethods,
        peakMonth,
        comparison: {
          currentTotal,
          previousTotal,
          changePercent,
          trend: changePercent === null
            ? "no-data"
            : changePercent > 0 ? "up" : changePercent < 0 ? "down" : "same",
        },
      },
    });
  } catch (err) {
    console.error("GetYearlyAnalytics error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch yearly analytics.",
    });
  }
};

// ─── @route   GET /api/analytics/category/:category ──────────────────────────
// ─── @access  Private
// Deep dive into a single category with full history + trend

const getCategoryAnalytics = async (req, res) => {
  try {
    const userId   = req.user._id;
    const category = req.params.category.toLowerCase().trim();
    const { last30Days, now, startOfYear, endOfYear } = getDateRanges();

    const [last30Summary, monthlyTrend, recentExpenses] = await Promise.all([
      // Total for this category in last 30 days
      Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            category,
            date: { $gte: last30Days, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            avg:   { $avg: "$amount" },
            max:   { $max: "$amount" },
          },
        },
      ]),

      // Monthly trend for this category across the current year
      Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            category,
            date: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        {
          $group: {
            _id: { $month: "$date" },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            month: "$_id",
            monthName: {
              $arrayElemAt: [
                ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                "$_id",
              ],
            },
            total: 1,
            count: 1,
          },
        },
      ]),

      // Last 10 expenses in this category
      Expense.find({
        userId: req.user._id,
        category,
      })
        .sort({ date: -1 })
        .limit(10)
        .lean(),
    ]);

    const monthlyWithZeros = fillMissingMonths(monthlyTrend, 12);

    return res.status(200).json({
      success: true,
      data: {
        category,
        last30Days: last30Summary[0] || { total: 0, count: 0, avg: 0, max: 0 },
        monthlyTrend: monthlyWithZeros,
        recentExpenses,
      },
    });
  } catch (err) {
    console.error("GetCategoryAnalytics error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category analytics.",
    });
  }
};

module.exports = {
  getOverview,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
  getCategoryAnalytics,
};