import axios from "axios";

const API_URL = "/api/notifications";

const getNotifications = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

const markRead = async (id) => {
  const response = await axios.put(`${API_URL}/${id}/read`);
  return response.data;
};

const markAllRead = async () => {
  const response = await axios.put(`${API_URL}/read-all`);
  return response.data;
};

const clearAll = async () => {
  const response = await axios.delete(API_URL);
  return response.data;
};

const notificationService = {
  getNotifications,
  markRead,
  markAllRead,
  clearAll,
};

export default notificationService;
