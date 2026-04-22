const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // indexed for fast user-based queries
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      lowercase: true,
    },
    subcategory: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note cannot exceed 300 characters"],
      default: "",
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true, // indexed for fast date-range queries in analytics
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "netbanking", "wallet", "other"],
      default: "upi",
    },
    tags: {
      type: [String],
      default: [],
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringInterval: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for most common analytics query pattern
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });
expenseSchema.index({ userId: 1, date: -1, category: 1 });

// Virtual: formatted amount (useful when populating in responses)
expenseSchema.virtual("formattedAmount").get(function () {
  return `₹${this.amount.toFixed(2)}`;
});

// Static method: get total for a user in a date range
// Pass an optional `category` string to restrict the sum to that category only
expenseSchema.statics.getTotalInRange = async function (userId, startDate, endDate, category) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDate, $lte: endDate },
  };

  // If a category is provided, only sum expenses in that category
  if (category) {
    matchStage.category = category.toLowerCase().trim();
  }

  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { total: 0, count: 0 };
};

module.exports = mongoose.model("Expense", expenseSchema);