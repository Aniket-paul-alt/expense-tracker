import { createSlice, nanoid } from "@reduxjs/toolkit";

const STORAGE_KEY = "expense_notifications";

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (notifications) => {
  try {
    // Keep at most 100 entries
    const trimmed = notifications.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items: loadFromStorage(),
    unreadCount: 0,
  },
  reducers: {
    addNotification: (state, action) => {
      const notification = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
        // type: "budget_exceeded" | "budget_warning" | "info"
        // title, message, category, period, spent, budget, percentage
      };
      state.items.unshift(notification); // newest first
      state.unreadCount = state.items.filter((n) => !n.read).length;
      saveToStorage(state.items);
    },
    markAllRead: (state) => {
      state.items = state.items.map((n) => ({ ...n, read: true }));
      state.unreadCount = 0;
      saveToStorage(state.items);
    },
    markRead: (state, action) => {
      const item = state.items.find((n) => n.id === action.payload);
      if (item) item.read = true;
      state.unreadCount = state.items.filter((n) => !n.read).length;
      saveToStorage(state.items);
    },
    clearAll: (state) => {
      state.items = [];
      state.unreadCount = 0;
      saveToStorage([]);
    },
    // Called on app boot to recount unread from localStorage
    syncUnread: (state) => {
      state.unreadCount = state.items.filter((n) => !n.read).length;
    },
  },
});

export const {
  addNotification,
  markAllRead,
  markRead,
  clearAll,
  syncUnread,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
