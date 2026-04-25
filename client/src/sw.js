// ─── Custom Service Worker ────────────────────────────────────────────────────
// This file is processed by vite-plugin-pwa (injectManifest strategy).
// self.__WB_MANIFEST is replaced with the precache manifest by Workbox.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Precache all assets built by Vite
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Firebase Messaging (Background) ─────────────────────────────────────────
// self.__FIREBASE_CONFIG is injected at build time by vite.config.js define.
// When the PWA is backgrounded or killed, FCM delivers messages here via
// onBackgroundMessage — this is the key to reliable Android notifications.

const firebaseConfig = self.__FIREBASE_CONFIG || {};

if (firebaseConfig.projectId) {
  const app       = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    console.log('[SW] FCM background message received:', payload);

    // FCM payload may carry data in .notification or .data depending on how
    // the server sent it. We check both so neither is missed.
    const n = payload.notification || {};
    const d = payload.data         || {};

    const title = n.title || d.title || 'Expense Tracker';
    const body  = n.body  || d.body  || '';
    const icon  = n.icon  || d.icon  || '/icons/pwa-192x192.png';
    const badge = d.badge || '/icons/pwa-192x192.png';
    const tag   = d.tag   || 'expense-tracker';
    const url   = d.url   || payload.fcmOptions?.link || '/';

    return self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      data: { url },
    });
  });
}

// ─── VAPID Push Event (legacy fallback) ───────────────────────────────────────
// Handles push events sent via the old VAPID / web-push path.
// FCM messages go through onBackgroundMessage above, not here.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Expense Tracker', body: event.data.text() };
  }

  const {
    title = 'Expense Tracker',
    body  = '',
    icon  = '/icons/pwa-192x192.png',
    badge = '/icons/pwa-192x192.png',
    tag   = 'expense-tracker',
    url   = '/',
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      data: { url },
    })
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── Push Subscription Change ─────────────────────────────────────────────────

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then(async (subscription) => {
        const allClients = await clients.matchAll({ includeUncontrolled: true });
        for (const client of allClients) {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_RENEWED', subscription });
        }
      })
  );
});
