import axiosBase from "../services/axiosBase";

// ─── Convert VAPID key from base64url to Uint8Array ───────────────────────────
// Required by PushManager.subscribe()

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

// ─── Fetch VAPID public key from the server ───────────────────────────────────

export const getVapidPublicKey = async () => {
  // Use the env variable if available (faster, works offline after first load)
  if (import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    return import.meta.env.VITE_VAPID_PUBLIC_KEY;
  }
  const res = await axiosBase.get("/api/push/vapid-key");
  return res.data.publicKey;
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

// ─── Subscribe to Web Push ────────────────────────────────────────────────────
// Calls PushManager.subscribe() then saves the subscription object to the server.

export const subscribeToPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidKey     = await getVapidPublicKey();

  // Create (or retrieve existing) push subscription
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  // Store subscription on the server
  await axiosBase.post("/api/push/subscribe", { subscription });

  return subscription;
};

// ─── Unsubscribe from Web Push ────────────────────────────────────────────────

export const unsubscribeFromPush = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registration   = await navigator.serviceWorker.ready;
  const subscription   = await registration.pushManager.getSubscription();

  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  // Tell the server to remove the subscription
  await axiosBase.delete("/api/push/unsubscribe", { data: { endpoint } });
};

// ─── Check if currently subscribed ───────────────────────────────────────────

export const getIsSubscribed = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
};
