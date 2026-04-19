// ─── Custom Service Worker ────────────────────────────────────────────────────
// This file is processed by vite-plugin-pwa (injectManifest strategy).
// self.__WB_MANIFEST is replaced with the precache manifest by Workbox.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// Precache all assets built by Vite
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Push Event ───────────────────────────────────────────────────────────────
// Fires when the server sends a push message via Web Push Protocol.
// Works even when the app is closed / in the background.

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
      tag,                  // replaces previous notification with same tag
      renotify: true,       // vibrate even if replacing
      data: { url },
    })
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
// When user taps a notification — open or focus the app window.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If app is already open, focus it and navigate
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── Push Subscription Change ──────────────────────────────────────────────────
// Browser auto-renews subscriptions; we need to send the new one to the server.

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then(async (subscription) => {
        // Notify the app page to re-register the new subscription with the server
        const allClients = await clients.matchAll({ includeUncontrolled: true });
        for (const client of allClients) {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_RENEWED', subscription });
        }
      })
  );
});
