const webpush = require("web-push");
const PushSubscription = require("../models/pushSubscription.model");

// ─── Send Push Notification ───────────────────────────────────────────────────
// Sends a push notification to a single subscription object.
// Automatically cleans up expired / invalid subscriptions from the DB.

const sendPushToSubscription = async (dbSub, payload) => {
  try {
    await webpush.sendNotification(dbSub.subscription, JSON.stringify(payload));
  } catch (err) {
    // 410 Gone / 404 Not Found = subscription is no longer valid, remove it
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[Push] Removing stale subscription ${dbSub._id}`);
      await PushSubscription.findByIdAndDelete(dbSub._id).catch(() => {});
    } else {
      console.error("[Push] sendNotification error:", err.message);
    }
  }
};

// ─── Send Push to All Subscriptions of a User ────────────────────────────────

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

    await Promise.allSettled(subs.map((sub) => sendPushToSubscription(sub, payload)));
  } catch (err) {
    console.error("[Push] sendPushToUser error:", err.message);
  }
};

module.exports = { sendPushToUser };
