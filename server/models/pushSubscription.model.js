const mongoose = require("mongoose");

// ─── Push Subscription Model ──────────────────────────────────────────────────
// Supports two delivery modes per device:
//   1. fcmToken   — Firebase Cloud Messaging (preferred, guaranteed Android delivery)
//   2. subscription — VAPID Web Push (legacy fallback)
// Deduplication is done at the application level (upsert by userId+fcmToken).

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── FCM token (preferred) ────────────────────────────────────────────────
    fcmToken: {
      type: String,
      default: null,
    },

    // ── Legacy VAPID Web Push subscription ───────────────────────────────────
    subscription: {
      endpoint: { type: String },
      keys: {
        p256dh: { type: String },
        auth:   { type: String },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);

