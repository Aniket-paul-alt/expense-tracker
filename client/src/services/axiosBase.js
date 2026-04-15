import axios from "axios";
import { store } from "../app/store";
import { logout } from "../features/auth/authSlice";

const axiosBase = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attaches JWT token to every outgoing request automatically

axiosBase.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Handles global errors — 401 logs user out, others pass through

axiosBase.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "Something went wrong.";

    // Token expired or invalid — force logout
    if (status === 401) {
      store.dispatch(logout());
      window.location.href = "/login";
    }

    // Return a clean error object so every service gets consistent shape
    return Promise.reject({
      status,
      message,
      errors: error.response?.data?.errors || [],
    });
  }
);

export default axiosBase;