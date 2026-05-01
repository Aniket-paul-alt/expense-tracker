const webpush = require("web-push");
const PushSubscription = require("../models/pushSubscription.model");
const { sendFCMToToken } = require("./fcmSend");

// ─── Send via FCM token (Android / Chrome — most reliable) ───────────────────

const sendViaFCM = async (dbSub, payload) => {
  const result = await sendFCMToToken(dbSub.fcmToken, payload);
  if (result && result.stale) {
    console.log(`[Push] Removing stale FCM token for sub ${dbSub._id}`);
  }
};

// ─── Send via VAPID / web-push (legacy fallback) ─────────────────────────────

const sendViaWebPush = async (dbSub, payload) => {
  try {
    const options = {
      urgency: "high",
      TTL: 86400, // 24 hours
    };
    await webpush.sendNotification(dbSub.subscription, JSON.stringify(payload), options);
  } catch (err) {
    const code = err.statusCode;
    const body = err.body || "(no body)";
    console.error(`[Push] VAPID send failed — HTTP ${code}: ${body}`);
    // 410 Gone / 404 Not Found = subscription expired → remove it
    // 401 Unauthorized = VAPID key mismatch → remove it (can't fix without re-subscribe)
    if (code === 410 || code === 404 || code === 401) {
      console.log(`[Push] Removing invalid VAPID subscription ${dbSub._id} (HTTP ${code})`);
      await PushSubscription.findByIdAndDelete(dbSub._id).catch(() => {});
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
        // Prioritize VAPID over FCM to bypass FCM-specific Doze deferral issues on Android.
        // VAPID uses standard Web Push with explicitly set urgency/TTL which is more reliable.
        if (sub.subscription?.endpoint) return sendViaWebPush(sub, payload);
        // Fallback to FCM only if VAPID is unavailable
        if (sub.fcmToken) return sendViaFCM(sub, payload);
        return Promise.resolve();
      })
    );
  } catch (err) {
    console.error("[Push] sendPushToUser error:", err.message);
  }
};

module.exports = { sendPushToUser };
