const mongoose = require("mongoose");

// ─── Push Subscription Model ──────────────────────────────────────────────────
// Stores Web Push API subscriptions per user device.
// A single user can have multiple subscriptions (e.g. phone + tablet).

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The full PushSubscription object from the browser
    subscription: {
      endpoint: { type: String, required: true, unique: true },
      keys: {
        p256dh: { type: String, required: true },
        auth:   { type: String, required: true },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
