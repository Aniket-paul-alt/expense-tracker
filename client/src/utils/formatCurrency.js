export const formatCurrency = (amount, symbol = "₹") => {
  if (amount === null || amount === undefined) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatCompact = (amount, symbol = "₹") => {
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)   return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount}`;
};