import axiosBase from "../services/axiosBase";
import { getFCMToken } from "../services/firebase";

// ─── Convert VAPID key from base64url to Uint8Array ───────────────────────────

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

// ─── Get current notification permission ─────────────────────────────────────

export const getNotificationPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
};

// ─── Request notification permission ─────────────────────────────────────────

export const requestPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
};

// ─── Subscribe to Push ────────────────────────────────────────────────────────
// Strategy:
//   1. Try FCM getToken() — preferred (guaranteed Android delivery)
//   2. Fall back to VAPID PushManager.subscribe() if FCM fails

export const subscribeToPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  await navigator.serviceWorker.ready;

  let fcmToken = null;
  let vapidSubscription = null;

  // ── Step 1: Try FCM ──────────────────────────────────────────────────────
  try {
    fcmToken = await getFCMToken();
    if (fcmToken) {
      console.log("[Push] FCM token obtained ✅");
    }
  } catch (fcmErr) {
    console.warn("[Push] FCM getToken failed, will fall back to VAPID:", fcmErr.message);
  }

  // ── Step 2: Also get VAPID subscription (belt-and-suspenders) ────────────
  // We keep the VAPID subscription as a fallback for non-Chrome browsers.
  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (vapidKey) {
      vapidSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log("[Push] VAPID subscription obtained ✅");
    }
  } catch (vapidErr) {
    // VAPID failure is non-fatal if we already have an FCM token
    if (!fcmToken) throw vapidErr;
    console.warn("[Push] VAPID subscribe failed (FCM will handle):", vapidErr.message);
  }

  if (!fcmToken && !vapidSubscription) {
    throw new Error("Failed to obtain any push subscription.");
  }

  // ── Step 3: Save to server ───────────────────────────────────────────────
  await axiosBase.post("/push/subscribe", {
    fcmToken:     fcmToken     || undefined,
    subscription: vapidSubscription ? vapidSubscription.toJSON() : undefined,
  });

  return { fcmToken, vapidSubscription };
};

// ─── Unsubscribe from Push ────────────────────────────────────────────────────

export const unsubscribeFromPush = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  let endpoint = null;
  if (subscription) {
    endpoint = subscription.endpoint;
    await subscription.unsubscribe();
  }

  // Tell the server to remove all subscriptions (FCM + VAPID) for this user
  await axiosBase.delete("/push/unsubscribe", {
    data: { endpoint: endpoint || undefined },
  });
};

// ─── Check if currently subscribed ───────────────────────────────────────────

export const getIsSubscribed = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
};

