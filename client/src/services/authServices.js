import axiosBase from "./axiosBase";

const authService = {
  register: async (data) => {
    const res = await axiosBase.post("/auth/register", data);
    return res.data;
  },

  login: async (data) => {
    const res = await axiosBase.post("/auth/login", data);
    return res.data;
  },

  getMe: async () => {
    const res = await axiosBase.get("/auth/me");
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await axiosBase.put("/auth/update-profile", data);
    return res.data;
  },

  changePassword: async (data) => {
    const res = await axiosBase.put("/auth/change-password", data);
    return res.data;
  },

  deleteAccount: async (data) => {
    const res = await axiosBase.delete("/auth/delete-account", { data });
    return res.data;
  },
};

export default authService;