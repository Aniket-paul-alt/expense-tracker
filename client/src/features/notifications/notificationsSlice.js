import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import notificationService from "../../services/notificationServices";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (_, thunkAPI) => {
    try {
      const res = await notificationService.getNotifications();
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

export const markReadServer = createAsyncThunk(
  "notifications/markRead",
  async (id, thunkAPI) => {
    try {
      await notificationService.markRead(id);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

export const markAllReadServer = createAsyncThunk(
  "notifications/markAllRead",
  async (_, thunkAPI) => {
    try {
      await notificationService.markAllRead();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

export const clearAllServer = createAsyncThunk(
  "notifications/clearAll",
  async (_, thunkAPI) => {
    try {
      await notificationService.clearAll();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
  },
  reducers: {
    addNotification: (state, action) => {
      // For immediate feedback from local actions (like budget alerts after creation)
      state.items.unshift(action.payload);
      state.unreadCount = state.items.filter((n) => !n.isRead).length;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
        state.unreadCount = state.items.filter((n) => !n.isRead).length;
        state.loading = false;
      })
      .addCase(markReadServer.fulfilled, (state, action) => {
        const item = state.items.find((n) => n._id === action.payload);
        if (item) item.isRead = true;
        state.unreadCount = state.items.filter((n) => !n.isRead).length;
      })
      .addCase(markAllReadServer.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      })
      .addCase(clearAllServer.fulfilled, (state) => {
        state.items = [];
        state.unreadCount = 0;
      });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
