import { createSlice } from "@reduxjs/toolkit";

const analyticsSlice = createSlice({
  name: "analytics",
  initialState: {
    overview: null,
    activePeriod: "monthly", // daily | weekly | monthly | yearly
    loading: false,
    error: null,
  },
  reducers: {
    setActivePeriod: (state, action) => {
      state.activePeriod = action.payload;
    },
  },
});

export const { setActivePeriod } = analyticsSlice.actions;
export default analyticsSlice.reducer;