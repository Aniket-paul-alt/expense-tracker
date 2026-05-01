/**
 * One-time cleanup script — deletes ALL push subscriptions from MongoDB.
 * Run this ONCE after fixing the VAPID key mismatch to wipe stale records.
 *
 * Usage:
 *   node server/scripts/clearSubscriptions.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const PushSubscription = require("../models/pushSubscription.model");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await PushSubscription.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} stale push subscription(s).`);
  await mongoose.disconnect();
})();
