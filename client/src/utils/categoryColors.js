export const CATEGORY_COLORS = {
  food:          "#f97316",
  transport:     "#3b82f6",
  shopping:      "#a855f7",
  bills:         "#eab308",
  health:        "#22c55e",
  education:     "#06b6d4",
  travel:        "#f43f5e",
  entertainment: "#ec4899",
  investment:    "#10b981",
  other:         "#6b7280",
};

export const getCategoryColor = (category) => {
  return CATEGORY_COLORS[category?.toLowerCase()] || "#6b7280";
};

export const CATEGORY_ICONS = {
  food:          "🍔",
  transport:     "🚌",
  shopping:      "🛒",
  bills:         "💡",
  health:        "🏥",
  education:     "📚",
  travel:        "✈️",
  entertainment: "🎬",
  investment:    "📈",
  other:         "📦",
};

export const getCategoryIcon = (category) => {
  return CATEGORY_ICONS[category?.toLowerCase()] || "📦";
};