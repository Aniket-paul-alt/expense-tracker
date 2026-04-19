import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  getNotificationPermission,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getIsSubscribed,
} from "../utils/pushNotifications";

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [permission,    setPermission]    = useState(getNotificationPermission());
  const [isSubscribed,  setIsSubscribed]  = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState(null);

  // ── Check subscription status when user logs in ───────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    getIsSubscribed()
      .then(setIsSubscribed)
      .catch(() => setIsSubscribed(false));

    // Listen for SW message when subscription is auto-renewed
    const handleSWMessage = (event) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_RENEWED") {
        // Re-register with server (utils handles this via subscribeToPush)
        subscribeToPush()
          .then(() => setIsSubscribed(true))
          .catch(console.error);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
  }, [isAuthenticated]);

  // ── Request permission + subscribe ────────────────────────────────────────
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Request browser permission
      const perm = await requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError(perm === "denied"
          ? "Notifications are blocked. Please allow them in your browser settings."
          : "Notification permission was not granted."
        );
        return false;
      }

      // 2. Subscribe to push
      await subscribeToPush();
      setIsSubscribed(true);
      return true;
    } catch (err) {
      setError(err.message || "Failed to enable notifications.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);
      return true;
    } catch (err) {
      setError(err.message || "Failed to disable notifications.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    permission,      // "default" | "granted" | "denied" | "unsupported"
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    isSupported: "Notification" in window && "serviceWorker" in navigator && "PushManager" in window,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
