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

// ─── GET /api/push/firebase-config  (public) ─────────────────────────────────
// Returns the Firebase client-side config so the app can initialise firebase/app.
// Only public, non-secret fields are returned (these are safe to expose).

const getFirebaseConfig = (req, res) => {
  const {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_VAPID_KEY,
  } = process.env;

  if (!FIREBASE_PROJECT_ID) {
    return res.status(500).json({ success: false, message: "Firebase not configured." });
  }

  return res.status(200).json({
    success: true,
    config: {
      apiKey:            FIREBASE_API_KEY,
      authDomain:        FIREBASE_AUTH_DOMAIN,
      projectId:         FIREBASE_PROJECT_ID,
      storageBucket:     FIREBASE_STORAGE_BUCKET,
      messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
      appId:             FIREBASE_APP_ID,
    },
    vapidKey: FIREBASE_VAPID_KEY,
  });
};

// ─── POST /api/push/subscribe  (protected) ───────────────────────────────────
// Saves or updates a push subscription for the current user.
// Accepts:
//   { fcmToken: "..." }                         — FCM-only (preferred)
//   { subscription: { endpoint, keys } }        — VAPID-only (legacy)
//   { fcmToken: "...", subscription: { ... } }  — both

const subscribe = async (req, res) => {
  try {
    const { fcmToken, subscription } = req.body;

    if (!fcmToken && !subscription?.endpoint) {
      return res.status(400).json({
        success: false,
        message: "Provide either an fcmToken or a Web Push subscription object.",
      });
    }

    // Validate VAPID subscription if provided
    if (subscription && (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth)) {
      return res.status(400).json({ success: false, message: "Invalid subscription object." });
    }

    if (fcmToken) {
      // Upsert by userId — one FCM token per user (updates on re-subscribe)
      // Using $set ensures only named fields are written; no subscription field
      // means MongoDB won't try to index a null endpoint.
      await PushSubscription.findOneAndUpdate(
        { userId: req.user._id, fcmToken },
        { $set: { userId: req.user._id, fcmToken } },
        { upsert: true, new: true }
      );
    } else {
      // Upsert by VAPID endpoint (legacy fallback)
      await PushSubscription.findOneAndUpdate(
        { "subscription.endpoint": subscription.endpoint },
        { $set: { userId: req.user._id, subscription } },
        { upsert: true, new: true }
      );
    }

    console.log(`[Push] Subscribed user ${req.user._id} (FCM: ${!!fcmToken}, VAPID: ${!!subscription})`);
    return res.status(201).json({ success: true, message: "Subscribed to push notifications." });
  } catch (err) {
    console.error("Push subscribe error:", err.code, err.message, err);
    return res.status(500).json({ success: false, message: "Failed to save subscription." });
  }
};

// ─── DELETE /api/push/unsubscribe  (protected) ───────────────────────────────
// Removes all push subscriptions for the current user (or a specific endpoint/token).

const unsubscribe = async (req, res) => {
  try {
    const { endpoint, fcmToken } = req.body || {};

    const filter = { userId: req.user._id };
    if (fcmToken)  filter.fcmToken = fcmToken;
    else if (endpoint) filter["subscription.endpoint"] = endpoint;

    const result = await PushSubscription.deleteMany(filter);
    console.log(`[Push] Removed ${result.deletedCount} subscription(s) for user ${req.user._id}`);

    return res.status(200).json({ success: true, message: "Unsubscribed from push notifications." });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return res.status(500).json({ success: false, message: "Failed to remove subscription." });
  }
};

// ─── GET /api/push/status  (public) ──────────────────────────────────────────
// Diagnostic endpoint to check if the server is correctly configured for push.
const getPushStatus = (req, res) => {
  const fcmReady = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );

  const vapidReady = !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );

  return res.status(200).json({
    success: true,
    fcmReady,
    vapidReady,
    message: fcmReady && vapidReady 
      ? "Server is fully configured for push notifications." 
      : "Server is missing environment variables for push notifications."
  });
};

module.exports = { getVapidPublicKey, getFirebaseConfig, subscribe, unsubscribe, getPushStatus };
