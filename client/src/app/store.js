import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import expenseReducer from "../features/expense/expenseSlice";
import analyticsReducer from "../features/analytics/analyticsSlice";
import budgetReducer from "../features/budget/budgetSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    analytics: analyticsReducer,
    budget: budgetReducer,
  },
});