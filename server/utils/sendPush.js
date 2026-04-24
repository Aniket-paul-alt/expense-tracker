const webpush = require("web-push");
const PushSubscription = require("../models/pushSubscription.model");
const { sendFCMToToken } = require("./fcmSend");

// ─── Send via FCM token (Android / Chrome — most reliable) ───────────────────

const sendViaFCM = async (dbSub, payload) => {
  const result = await sendFCMToToken(dbSub.fcmToken, payload);
  if (result && result.stale) {
    console.log(`[Push] Removing stale FCM token for sub ${dbSub._id}`);
    await PushSubscription.findByIdAndDelete(dbSub._id).catch(() => {});
  }
};

// ─── Send via VAPID / web-push (legacy fallback) ─────────────────────────────

const sendViaWebPush = async (dbSub, payload) => {
  try {
    await webpush.sendNotification(dbSub.subscription, JSON.stringify(payload));
  } catch (err) {
    // 410 Gone / 404 Not Found = subscription is no longer valid, remove it
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[Push] Removing stale VAPID subscription ${dbSub._id}`);
      await PushSubscription.findByIdAndDelete(dbSub._id).catch(() => {});
    } else {
      console.error("[Push] sendNotification error:", err.message);
    }
  }
};

// ─── Send Push to All Subscriptions of a User ────────────────────────────────
// Prefers FCM tokens when available, falls back to VAPID web-push.

const sendPushToUser = async (userId, { title, body, icon, badge, tag, url }) => {
  try {
    const subs = await PushSubscription.find({ userId });
    if (!subs.length) return;

    const payload = {
      title,
      body,
      icon:  icon  || "/icons/pwa-192x192.png",
      badge: badge || "/icons/pwa-192x192.png",
      tag:   tag   || "expense-tracker",
      url:   url   || "/",
    };

    await Promise.allSettled(
      subs.map((sub) => {
        // If we have an FCM token, use FCM (preferred — guaranteed Android delivery)
        if (sub.fcmToken) return sendViaFCM(sub, payload);
        // Otherwise fall back to VAPID web-push
        if (sub.subscription?.endpoint) return sendViaWebPush(sub, payload);
        return Promise.resolve();
      })
    );
  } catch (err) {
    console.error("[Push] sendPushToUser error:", err.message);
  }
};

module.exports = { sendPushToUser };
