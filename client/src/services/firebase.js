import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import axiosBase from "./axiosBase";

// ─── Firebase App Initialisation ─────────────────────────────────────────────
// Config is fetched from our own server so we don't bake secrets into the bundle.
// Falls back to Vite env vars if the server isn't reachable (e.g. local dev).

let _app = null;
let _messaging = null;

const getFirebaseConfig = async () => {
  // Prefer env vars baked at build time (set on Netlify)
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      config: {
        apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId:             import.meta.env.VITE_FIREBASE_APP_ID,
      },
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    };
  }

  // Otherwise fetch from server
  const res = await axiosBase.get("/push/firebase-config");
  return res.data; // { config: {...}, vapidKey: "..." }
};

// ─── Lazy init — called once the user grants permission ──────────────────────

export const getFirebaseMessaging = async () => {
  if (_messaging) return { messaging: _messaging, vapidKey: window.__fcmVapidKey };

  const { config, vapidKey } = await getFirebaseConfig();
  window.__fcmVapidKey = vapidKey; // stash for later calls

  // Avoid double initialisation (e.g. React StrictMode double-render)
  _app = getApps().length ? getApps()[0] : initializeApp(config);
  _messaging = getMessaging(_app);

  return { messaging: _messaging, vapidKey };
};

// ─── Get FCM Registration Token ───────────────────────────────────────────────
// Registers the browser with FCM and returns a token to send to our server.
// We explicitly register firebase-messaging-sw.js so FCM uses that worker for
// background messages (instead of our Vite sw.js which doesn't have onBackgroundMessage).

export const getFCMToken = async () => {
  const { messaging, vapidKey } = await getFirebaseMessaging();

  // Use the existing Vite PWA service worker for FCM instead of registering a separate one.
  // This prevents sw.js and firebase-messaging-sw.js from fighting over the same scope,
  // which causes background push notifications to be dropped.
  const fcmRegistration = await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: fcmRegistration,
  });

  return token; // null if permission not granted
};

// ─── Handle foreground messages ───────────────────────────────────────────────
// When the app is in the foreground, FCM does NOT show a system notification
// automatically — we must handle it here (shows toast or in-app banner).

export const onForegroundMessage = async (callback) => {
  const { messaging } = await getFirebaseMessaging();
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
