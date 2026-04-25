// ─── Custom Service Worker ─────────────────────────────────────────────────
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Push Event ────────────────────────────────────────────────────────────
// Handles both FCM (Chrome passes the message here) and legacy VAPID.
// When FCM sends a message with a .notification field, Chrome on Android
// may auto-display it — but having this handler ensures it always shows.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: 'Expense Tracker', body: event.data.text() }; }

  const title = payload.title || payload.notification?.title || 'Expense Tracker';
  const body  = payload.body  || payload.notification?.body  || '';
  const icon  = payload.icon  || '/icons/pwa-192x192.png';
  const badge = payload.badge || '/icons/pwa-192x192.png';
  const tag   = payload.tag   || 'expense-tracker';
  const url   = payload.url   || payload.fcmOptions?.link || '/';

  event.waitUntil(
    self.registration.showNotification(title, { body, icon, badge, tag, renotify: true, data: { url } })
  );
});

// ─── Notification Click ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.focus(); w.navigate(targetUrl); return; }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ─── Push Subscription Change ───────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: event.oldSubscription?.options?.applicationServerKey })
      .then(async (sub) => {
        const all = await clients.matchAll({ includeUncontrolled: true });
        for (const c of all) c.postMessage({ type: 'PUSH_SUBSCRIPTION_RENEWED', subscription: sub });
      })
  );
});
