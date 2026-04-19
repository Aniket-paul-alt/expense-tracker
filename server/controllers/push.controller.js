const PushSubscription = require("../models/pushSubscription.model");

// ─── GET /api/push/vapid-key  (public) ───────────────────────────────────────
// Returns the VAPID public key so the client can call PushManager.subscribe()

const getVapidPublicKey = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(500).json({ success: false, message: "VAPID not configured." });
  }
  return res.status(200).json({ success: true, publicKey: key });
};

// ─── POST /api/push/subscribe  (protected) ───────────────────────────────────
// Saves or updates a push subscription for the current user.

const subscribe = async (req, res) => {
  try {
    // Accept both { subscription: {...} } and the raw object at root
    const subscription = req.body.subscription ?? req.body;
    console.log("⬇️  Full req.body:", JSON.stringify(req.body, null, 2));
    console.log("⬇️  subscription:", subscription);
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ success: false, message: "Invalid subscription object." });
    }

    // Upsert by endpoint (same device re-subscribing should update, not duplicate)
    await PushSubscription.findOneAndUpdate(
      { "subscription.endpoint": subscription.endpoint },
      { userId: req.user._id, subscription },
      { upsert: true, new: true }
    );

    return res.status(201).json({ success: true, message: "Subscribed to push notifications." });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return res.status(500).json({ success: false, message: "Failed to save subscription." });
  }
};

// ─── DELETE /api/push/unsubscribe  (protected) ───────────────────────────────
// Removes all push subscriptions for the current user (or a specific endpoint).

const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};   // body can be empty on DELETE requests

    const filter = { userId: req.user._id };
    if (endpoint) filter["subscription.endpoint"] = endpoint;

    const result = await PushSubscription.deleteMany(filter);
    console.log(`[Push] Removed ${result.deletedCount} subscription(s) for user ${req.user._id}`);

    return res.status(200).json({ success: true, message: "Unsubscribed from push notifications." });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return res.status(500).json({ success: false, message: "Failed to remove subscription." });
  }
};

module.exports = { getVapidPublicKey, subscribe, unsubscribe };
