import axiosBase from "./axiosBase";

const analyticsService = {
  getOverview: async () => {
    const res = await axiosBase.get("/analytics/overview");
    return res.data;
  },

  getDaily: async (date) => {
    const res = await axiosBase.get("/analytics/daily", {
      params: date ? { date } : {},
    });
    return res.data;
  },

  getWeekly: async (startDate) => {
    const res = await axiosBase.get("/analytics/weekly", {
      params: startDate ? { startDate } : {},
    });
    return res.data;
  },

  getMonthly: async (month, year) => {
    const res = await axiosBase.get("/analytics/monthly", {
      params: { month, year },
    });
    return res.data;
  },

  getYearly: async (year) => {
    const res = await axiosBase.get("/analytics/yearly", {
      params: { year },
    });
    return res.data;
  },

  getCategoryAnalytics: async (category) => {
    const res = await axiosBase.get(`/analytics/category/${category}`);
    return res.data;
  },
};

export default analyticsService;