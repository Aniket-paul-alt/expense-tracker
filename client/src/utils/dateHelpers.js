import { format, startOfMonth, endOfMonth, subDays } from "date-fns";

export const formatDate = (date, fmt = "dd MMM yyyy") => {
  if (!date) return "";
  return format(new Date(date), fmt);
};

// Returns time in "3:24 PM" style from any ISO / Date value
export const formatTime = (date) => {
  if (!date) return "";
  return format(new Date(date), "h:mm a");
};

export const formatShortDate = (date) => formatDate(date, "dd MMM");

export const formatMonthYear = (date) => formatDate(date, "MMM yyyy");

export const getTodayISO = () => format(new Date(), "yyyy-MM-dd");

export const getThisMonthRange = () => ({
  startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
  endDate:   format(endOfMonth(new Date()),   "yyyy-MM-dd"),
});

export const getLast7DaysRange = () => ({
  startDate: format(subDays(new Date(), 6), "yyyy-MM-dd"),
  endDate:   getTodayISO(),
});