const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const budgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  period: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
    default: "monthly",
  },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },
    currency: {
      code: { type: String, default: "INR" },
      symbol: { type: String, default: "₹" },
    },
    budgets: [budgetSchema],
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      // Granular notification toggles
      dailyReminder: {
        type: Boolean,
        default: true,  // opted-in by default once permission is granted
      },
      // "HH:MM" in IST — e.g. "20:00" = 8 PM IST. Defaults to 8 PM.
      reminderTime: {
        type: String,
        default: "20:00",
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, "reminderTime must be HH:MM"],
      },
      budgetAlerts: {
        type: Boolean,
        default: true,
      },
    },
    customSubcategories: {
      type: Map,
      of: [String],
      default: {},
    },
    customCategories: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  // only hash if password was modified
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method: compare entered password with hashed
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method: check if a category budget is exceeded
userSchema.methods.getBudgetForCategory = function (category) {
  return this.budgets.find(
    (b) => b.category.toLowerCase() === category.toLowerCase()
  );
};

module.exports = mongoose.model("User", userSchema);