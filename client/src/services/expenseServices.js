import axiosBase from "./axiosBase";

const expenseService = {
  getAll: async (filters = {}) => {
    const res = await axiosBase.get("/expenses", { params: filters });
    return res.data;
  },

  getById: async (id) => {
    const res = await axiosBase.get(`/expenses/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await axiosBase.post("/expenses", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await axiosBase.put(`/expenses/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await axiosBase.delete(`/expenses/${id}`);
    return res.data;
  },

  deleteBulk: async (ids) => {
    const res = await axiosBase.delete("/expenses/bulk", { data: { ids } });
    return res.data;
  },

  getSummary: async () => {
    const res = await axiosBase.get("/expenses/summary");
    return res.data;
  },

  exportCSV: async (filters = {}) => {
    const res = await axiosBase.get("/expenses/export", {
      params: filters,
      responseType: "blob",
    });
    return res.data;
  },
};

export default expenseService;