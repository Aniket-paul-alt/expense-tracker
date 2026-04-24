// ─── Custom Service Worker ────────────────────────────────────────────────────
// This file is processed by vite-plugin-pwa (injectManifest strategy).
// self.__WB_MANIFEST is replaced with the precache manifest by Workbox.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// Precache all assets built by Vite
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Firebase Messaging (Background) ─────────────────────────────────────────
// FCM requires the compat SDK loaded via importScripts in a service worker.
// These CDN scripts are cached by the browser after the first load.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// self.__FIREBASE_CONFIG is injected at build time via vite.config.js define.
// Falls back to a placeholder so the SW doesn't crash when config is missing.
const firebaseConfig = self.__FIREBASE_CONFIG || {};

if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // ── Background / killed-app messages from FCM ──────────────────────────────
  // FCM calls this when a data-only message arrives and the app is not focused.
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] FCM background message:', payload);

    const { title, body, icon, badge, tag, url } = payload.data || payload.notification || {};

    self.registration.showNotification(title || 'Expense Tracker', {
      body:      body  || '',
      icon:      icon  || '/icons/pwa-192x192.png',
      badge:     badge || '/icons/pwa-192x192.png',
      tag:       tag   || 'expense-tracker',
      renotify:  true,
      data:      { url: url || '/' },
    });
  });
}

// ─── VAPID Push Event (fallback for non-FCM browsers) ────────────────────────
// Fires when the server sends a push message via the legacy Web Push Protocol.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Expense Tracker', body: event.data.text() };
  }

  // Skip if this looks like an FCM message (FCM handles it via onBackgroundMessage)
  // FCM push events arrive with an empty data string or as notification-only
  if (payload?.from || payload?.['google.c.fid']) return;

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
