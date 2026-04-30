// ─── Firebase Messaging Service Worker ────────────────────────────────────────
// This file MUST be named "firebase-messaging-sw.js" and served from the root.
// Chrome's FCM SDK looks for it at exactly this path to handle background pushes.
//
// ⚠️  Do NOT rename or move this file.
// ⚠️  Firebase config here must match your Firebase project (same as frontend).
//
// This worker handles push messages when:
//   • The app tab is closed
//   • The phone/browser is in the background or locked
//
// It is separate from sw.js (Vite PWA worker) because FCM SDK requires full
// control of its own dedicated worker for background message interception.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ─── Firebase Config ──────────────────────────────────────────────────────────
// These are PUBLIC client-side values — safe to commit.
// They MUST match the values in your Netlify / Vite env vars.
firebase.initializeApp({
  apiKey:            "AIzaSyAi9LN-_Z5ab21d5H9grBNTX4NQA4kMByU",
  authDomain:        "expense-tracker-c4c88.firebaseapp.com",
  projectId:         "expense-tracker-c4c88",
  storageBucket:     "expense-tracker-c4c88.firebasestorage.app",
  messagingSenderId: "1070014302557",
  appId:             "1:1070014302557:web:fda307867e9aa4de5f80b4",
});

const messaging = firebase.messaging();

// ─── Background Message Handler ───────────────────────────────────────────────
// Called when a push arrives while the app is in the background / closed.
// FCM passes the full payload here; we extract data and show the notification.

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw] Background message received:", payload);

  // payload.data is what we set in fcmSend.js → webpush.data
  const data         = payload.data         || {};
  const notification = payload.notification || {};

  const title = data.title || notification.title || "Expense Tracker";
  const body  = data.body  || notification.body  || "You have a new notification";
  const icon  = data.icon  || notification.icon  || "/icons/pwa-192x192.png";
  const badge = data.badge                       || "/icons/pwa-192x192.png";
  const tag   = data.tag   || notification.tag   || "expense-tracker";
  const url   = data.url   || payload.fcmOptions?.link || "/";

  return self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    data: { url },
  });
});

// ─── Notification Click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if ("focus" in w) {
            w.focus();
            w.navigate(targetUrl);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
