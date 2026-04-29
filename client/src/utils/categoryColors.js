export const CATEGORY_COLORS = {
  food:          "#f97316",
  transport:     "#3b82f6",
  shopping:      "#a855f7",
  recharges:     "#0ea5e9",
  bills:         "#eab308",
  health:        "#22c55e",
  education:     "#06b6d4",
  travel:        "#f43f5e",
  entertainment: "#ec4899",
  investment:    "#10b981",
  hobby:         "#d946ef",
  other:         "#6b7280",
};

const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const getCategoryColor = (category) => {
  const cat = category?.toLowerCase();
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  
  if (!cat) return "#6b7280";
  
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const h = Math.abs(hash) % 360;
  return hslToHex(h, 70, 45); 
};

export const CATEGORY_ICONS = {
  food:          "🍔",
  transport:     "🚌",
  shopping:      "🛒",
  recharges:     "📱",
  bills:         "💡",
  health:        "🏥",
  education:     "📚",
  travel:        "✈️",
  entertainment: "🎬",
  investment:    "📈",
  hobby:         "🎨",
  other:         "📦",
};

export const getCategoryIcon = (category) => {
  return CATEGORY_ICONS[category?.toLowerCase()] || "📁";
};