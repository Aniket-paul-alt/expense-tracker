import axiosBase from "../services/axiosBase";
import { getFCMToken } from "../services/firebase";

const FCM_STORAGE_KEY = "fcm_subscribed"; // localStorage flag

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

export const getNotificationPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

export const requestPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
};

// ─── Subscribe ─────────────────────────────────────────────────────────────
export const subscribeToPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  console.log("[Push] Step 1: Waiting for service worker...");
  await navigator.serviceWorker.ready;
  console.log("[Push] Step 1 done: SW ready");

  let fcmToken = null;

  // Step 2 — FCM is disabled to force standard VAPID Web Push.
  // Standard VAPID is much more reliable for background delivery on modern Android/iOS
  // because it uses the browser's native push manager directly without Firebase wrapper bugs.

  // Step 3 — VAPID fallback (keeps state detectable via pushManager)
  let vapidSubscription = null;
  try {
    const registration = await navigator.serviceWorker.ready;
    let vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.log("[Push] Step 3: Fetching VAPID key from server...");
      const res = await axiosBase.get("/push/vapid-key");
      vapidKey = res.data.publicKey;
    }
    console.log("[Push] Step 3: VAPID key source:", vapidKey ? "found" : "MISSING");
    if (vapidKey) {
      vapidSubscription = await registration.pushManager.getSubscription();
      if (!vapidSubscription) {
        console.log("[Push] Step 3: Creating new VAPID subscription...");
        vapidSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      console.log("[Push] Step 3 done: VAPID subscription ✅");
    }
  } catch (vapidErr) {
    if (!fcmToken) throw vapidErr;
    console.warn("[Push] Step 3 failed (VAPID, FCM will handle):", vapidErr.message);
  }

  if (!fcmToken && !vapidSubscription) {
    throw new Error("Failed to obtain any push subscription.");
  }

  // Step 4 — save to server
  console.log("[Push] Step 4: Saving subscription to server...");
  await axiosBase.post("/push/subscribe", {
    fcmToken:     fcmToken     || undefined,
    subscription: vapidSubscription ? vapidSubscription.toJSON() : undefined,
  });
  console.log("[Push] Step 4 done: Saved to server ✅");

  // Persist state so UI stays correct across page reloads
  localStorage.setItem(FCM_STORAGE_KEY, "true");

  return { fcmToken, vapidSubscription };
};

// ─── Unsubscribe ────────────────────────────────────────────────────────────
export const unsubscribeFromPush = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  let endpoint = null;
  if (subscription) {
    endpoint = subscription.endpoint;
    await subscription.unsubscribe();
  }

  await axiosBase.delete("/push/unsubscribe", {
    data: { endpoint: endpoint || undefined },
  });

  localStorage.removeItem(FCM_STORAGE_KEY);
};

// ─── Check subscribed ───────────────────────────────────────────────────────
// Uses localStorage as primary source (fast, persists across reloads).
// Falls back to pushManager so it self-corrects if localStorage is stale.
export const getIsSubscribed = async () => {
  // If permission was revoked, always return false and clean up
  if ("Notification" in window && Notification.permission !== "granted") {
    localStorage.removeItem(FCM_STORAGE_KEY);
    return false;
  }

  // Fast path — localStorage flag set during subscribe
  if (localStorage.getItem(FCM_STORAGE_KEY) === "true") return true;

  // Slow path — check actual push subscription
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      localStorage.setItem(FCM_STORAGE_KEY, "true"); // self-heal
      return true;
    }
  } catch { /* ignore */ }
  return false;
};
