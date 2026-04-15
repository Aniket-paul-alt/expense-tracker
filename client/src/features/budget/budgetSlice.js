import { createSlice } from "@reduxjs/toolkit";

const budgetSlice = createSlice({
  name: "budget",
  initialState: {
    list: [],
    alerts: [],
    loading: false,
    error: null,
  },
  reducers: {
    setAlerts: (state, action) => {
      state.alerts = action.payload;
    },
  },
});

export const { setAlerts } = budgetSlice.actions;
export default budgetSlice.reducer;