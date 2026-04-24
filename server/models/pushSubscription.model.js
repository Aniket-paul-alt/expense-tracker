const mongoose = require("mongoose");

// ─── Push Subscription Model ──────────────────────────────────────────────────
// Supports two delivery modes per device:
//   1. fcmToken   — Firebase Cloud Messaging (preferred, guaranteed Android delivery)
//   2. subscription — VAPID Web Push (legacy fallback for browsers without FCM)
// A user can have multiple documents (one per device).

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── FCM token (preferred) ────────────────────────────────────────────────
    // Set when the browser registers with Firebase Cloud Messaging.
    fcmToken: {
      type: String,
      default: null,
      sparse: true, // allows multiple null values (unique only when non-null)
      unique: true,
    },

    // ── Legacy VAPID Web Push subscription object ────────────────────────────
    // Kept for backwards-compatibility; used only when fcmToken is absent.
    subscription: {
      endpoint: { type: String, sparse: true, unique: true },
      keys: {
        p256dh: { type: String },
        auth:   { type: String },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
