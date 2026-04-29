import axiosBase from "./axiosBase";

const API_URL = "/notifications";

const getNotifications = async () => {
  const response = await axiosBase.get(API_URL);
  return response.data;
};

const markRead = async (id) => {
  const response = await axiosBase.put(`${API_URL}/${id}/read`);
  return response.data;
};

const markAllRead = async () => {
  const response = await axiosBase.put(`${API_URL}/read-all`);
  return response.data;
};

const clearAll = async () => {
  const response = await axiosBase.delete(API_URL);
  return response.data;
};

const notificationService = {
  getNotifications,
  markRead,
  markAllRead,
  clearAll,
};

export default notificationService;
