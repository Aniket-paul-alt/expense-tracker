const mongoose = require("mongoose");

// ─── Date Range Helpers ───────────────────────────────────────────────────────

const getDateRanges = () => {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  endOfYear.setHours(23, 59, 59, 999);

  // Last 7 days (for weekly bar chart)
  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 6);
  last7Days.setHours(0, 0, 0, 0);

  // Last 30 days
  const last30Days = new Date(now);
  last30Days.setDate(now.getDate() - 29);
  last30Days.setHours(0, 0, 0, 0);

  // Last 12 months
  const last12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  return {
    now,
    startOfDay, endOfDay,
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    startOfYear, endOfYear,
    last7Days,
    last30Days,
    last12Months,
  };
};

// ─── Pipeline: Total + Count in a Date Range ─────────────────────────────────

const totalInRangePipeline = (userId, startDate, endDate) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$amount" },
      count: { $sum: 1 },
      avgPerExpense: { $avg: "$amount" },
      maxExpense: { $max: "$amount" },
      minExpense: { $min: "$amount" },
    },
  },
];

// ─── Pipeline: Breakdown by Category ─────────────────────────────────────────

const categoryBreakdownPipeline = (userId, startDate, endDate) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: "$category",
      total: { $sum: "$amount" },
      count: { $sum: 1 },
      avgAmount: { $avg: "$amount" },
    },
  },
  {
    $sort: { total: -1 },
  },
  {
    // Calculate percentage of each category vs total
    $group: {
      _id: null,
      categories: {
        $push: {
          category: "$_id",
          total: "$total",
          count: "$count",
          avgAmount: "$avgAmount",
        },
      },
      grandTotal: { $sum: "$total" },
    },
  },
  {
    $unwind: "$categories",
  },
  {
    $project: {
      _id: 0,
      category: "$categories.category",
      total: "$categories.total",
      count: "$categories.count",
      avgAmount: "$categories.avgAmount",
      percentage: {
        $round: [
          {
            $multiply: [
              { $divide: ["$categories.total", "$grandTotal"] },
              100,
            ],
          },
          1,
        ],
      },
    },
  },
  {
    $sort: { total: -1 },
  },
];

// ─── Pipeline: Daily Breakdown (last 7 or 30 days) ───────────────────────────

const dailyTrendPipeline = (userId, startDate, endDate) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$date" },
        month: { $month: "$date" },
        day:   { $dayOfMonth: "$date" },
      },
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
  },
  {
    $project: {
      _id: 0,
      date: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: {
            $dateFromParts: {
              year:  "$_id.year",
              month: "$_id.month",
              day:   "$_id.day",
            },
          },
        },
      },
      total: 1,
      count: 1,
    },
  },
];

// ─── Pipeline: Weekly Breakdown (by day of week) ─────────────────────────────

const weeklyBreakdownPipeline = (userId, startDate, endDate) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: { $dayOfWeek: "$date" }, // 1=Sun, 2=Mon ... 7=Sat
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { _id: 1 },
  },
  {
    $project: {
      _id: 0,
      dayOfWeek: "$_id",
      dayName: {
        $arrayElemAt: [
          ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          "$_id",
        ],
      },
      total: 1,
      count: 1,
    },
  },
];

// ─── Pipeline: Monthly Breakdown (by month in a year) ────────────────────────

const monthlyBreakdownPipeline = (userId, startDate, endDate) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: {
        year:  { $year: "$date" },
        month: { $month: "$date" },
      },
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { "_id.year": 1, "_id.month": 1 },
  },
  {
    $project: {
      _id: 0,
      year:  "$_id.year",
      month: "$_id.month",
      monthName: {
        $arrayElemAt: [
          ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          "$_id.month",
        ],
      },
      total: 1,
      count: 1,
    },
  },
];

// ─── Pipeline: Yearly Breakdown (month over month for a year) ────────────────

const yearlyBreakdownPipeline = (userId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate   = new Date(year, 11, 31, 23, 59, 59, 999);

  return [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $month: "$date" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
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
  ];
};

// ─── Pipeline: Top Expenses in a Range ───────────────────────────────────────

const topExpensesPipeline = (userId, startDate, endDate, limit = 5) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $sort: { amount: -1 },
  },
  {
    $limit: limit,
  },
  {
    $project: {
      _id: 1,
      amount: 1,
      category: 1,
      note: 1,
      date: 1,
      paymentMethod: 1,
    },
  },
];

// ─── Pipeline: Payment Method Breakdown ──────────────────────────────────────

const paymentMethodPipeline = (userId, startDate, endDate) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: "$paymentMethod",
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { total: -1 },
  },
  {
    $project: {
      _id: 0,
      method: "$_id",
      total: 1,
      count: 1,
    },
  },
];

// ─── Pipeline: Compare Two Periods ───────────────────────────────────────────
// e.g. this month vs last month

const comparePeriodsPipeline = (userId, currentStart, currentEnd, previousStart, previousEnd) => [
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: previousStart, $lte: currentEnd },
    },
  },
  {
    $group: {
      _id: {
        period: {
          $cond: [
            { $gte: ["$date", currentStart] },
            "current",
            "previous",
          ],
        },
      },
      total: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      period: "$_id.period",
      total: 1,
      count: 1,
    },
  },
];

module.exports = {
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
};