import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  getNotificationPermission,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getIsSubscribed,
} from "../utils/pushNotifications";
import { onForegroundMessage } from "../services/firebase";

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider = ({ children }) => {
  const { user, isLoggedIn } = useSelector((state) => state.auth);

  const [permission,    setPermission]    = useState(getNotificationPermission());
  const [isSubscribed,  setIsSubscribed]  = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState(null);

  // ── Check subscription status when user logs in ───────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    getIsSubscribed()
      .then(setIsSubscribed)
      .catch(() => setIsSubscribed(false));

    // Listen for SW message when VAPID subscription is auto-renewed
    const handleSWMessage = (event) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_RENEWED") {
        subscribeToPush()
          .then(() => setIsSubscribed(true))
          .catch(console.error);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
  }, [isLoggedIn]);

  // ── FCM Foreground Message Handler ───────────────────────────────────────
  // When the app is open (foreground), FCM does NOT show a system notification.
  // We catch the message here and show a toast instead so the user still sees it.
  useEffect(() => {
    if (!isLoggedIn || permission !== "granted") return;

    let unsubscribeFn;
    onForegroundMessage((payload) => {
      const data = payload.data || payload.notification || {};
      const title = data.title || "Expense Tracker";
      const body  = data.body  || "";
      const icon  = data.icon  || "/icons/pwa-192x192.png";
      const url   = data.url   || "/";

      // Show in-app toast
      toast(`🔔 ${title}${body ? `: ${body}` : ""}`, {
        duration: 6000,
        style: { maxWidth: "340px" },
      });

      // ALSO trigger a real system notification via the Service Worker
      // so it appears in the Android notification tray even when the app is open
      if ("serviceWorker" in navigator && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon,
            badge: "/icons/pwa-192x192.png",
            tag: data.tag || "expense-tracker",
            renotify: true,
            data: { url },
          });
        });
      }
    })
      .then((unsub) => { unsubscribeFn = unsub; })
      .catch(() => {}); // non-fatal if firebase isn't configured yet

    return () => { if (typeof unsubscribeFn === "function") unsubscribeFn(); };
  }, [isLoggedIn, permission]);

  // ── Request permission + subscribe ────────────────────────────────────────
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const perm = await requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError(perm === "denied"
          ? "Notifications are blocked. Please allow them in your browser settings."
          : "Notification permission was not granted."
        );
        return false;
      }

      // Add a timeout so the button never gets permanently stuck
      const subscribeWithTimeout = Promise.race([
        subscribeToPush(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Subscription timed out. Check console for details.")), 15000)
        ),
      ]);

      await subscribeWithTimeout;
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
      const msg = err?.message || "Failed to enable notifications.";
      setError(msg);
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

