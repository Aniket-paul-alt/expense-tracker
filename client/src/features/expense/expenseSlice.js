import { createSlice } from "@reduxjs/toolkit";

const expenseSlice = createSlice({
  name: "expenses",
  initialState: {
    list: [],
    pagination: null,
    filters: {
      startDate: "",
      endDate: "",
      category: "",
      paymentMethod: "",
      search: "",
      sortBy: "date",
      order: "desc",
      page: 1,
      limit: 20,
    },
    loading: false,
    error: null,
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload, page: 1 };
    },
    resetFilters: (state) => {
      state.filters = {
        startDate: "", endDate: "", category: "",
        paymentMethod: "", search: "",
        sortBy: "date", order: "desc", page: 1, limit: 20,
      };
    },
    setPage: (state, action) => {
      state.filters.page = action.payload;
    },
  },
});

export const { setFilters, resetFilters, setPage } = expenseSlice.actions;
export default expenseSlice.reducer;