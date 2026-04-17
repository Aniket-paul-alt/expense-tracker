import axiosBase from "./axiosBase";

const budgetService = {
  getAll: async () => {
    const res = await axiosBase.get("/budgets");
    return res.data;
  },

  getByCategory: async (category) => {
    const res = await axiosBase.get(`/budgets/${category}`);
    return res.data;
  },

  getAlerts: async () => {
    const res = await axiosBase.get("/budgets/alerts");
    return res.data;
  },

  create: async (data) => {
    const res = await axiosBase.post("/budgets", data);
    return res.data;
  },

  update: async (category, data) => {
    const res = await axiosBase.put(`/budgets/${category}`, data);
    return res.data;
  },

  delete: async (category) => {
    const res = await axiosBase.delete(`/budgets/${category}`);
    return res.data;
  },

  reset: async () => {
    const res = await axiosBase.post("/budgets/reset");
    return res.data;
  },
};

export default budgetService;