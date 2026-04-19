const cron        = require("node-cron");
const User        = require("../models/user.model");
const Expense     = require("../models/expense.model");
const PushSubscription = require("../models/pushSubscription.model");
const { sendPushToUser } = require("../utils/sendPush");

// ─── Daily Reminder Job ───────────────────────────────────────────────────────
// Runs every day at 20:00 IST (14:30 UTC).
// Finds users who:
//   1. Have daily reminder enabled in preferences
//   2. Have at least one active push subscription
//   3. Have NOT logged any expense today
// Sends them a push notification.

const startDailyReminderJob = () => {
  // "30 14 * * *" = 14:30 UTC = 20:00 IST every day
  cron.schedule("30 14 * * *", async () => {
    console.log("[Cron] Daily reminder job running at", new Date().toISOString());

    try {
      // Find users who have enabled daily reminder and have at least one subscription
      const subscribedUsers = await PushSubscription.distinct("userId");
      if (!subscribedUsers.length) return;

      // Filter to users with dailyReminder preference enabled (default true if not set)
      const users = await User.find({
        _id: { $in: subscribedUsers },
        $or: [
          { "preferences.dailyReminder": true },
          { "preferences.dailyReminder": { $exists: false } },
        ],
      }).select("_id name preferences");

      // Check which users have NOT logged any expense today
      const now  = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,  0,  0);
      const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const usersWithExpensesToday = await Expense.distinct("userId", {
        userId: { $in: users.map((u) => u._id) },
        date:   { $gte: startOfDay, $lte: endOfDay },
      });

      const usersWithExpensesSet = new Set(
        usersWithExpensesToday.map((id) => id.toString())
      );

      const usersToNotify = users.filter(
        (u) => !usersWithExpensesSet.has(u._id.toString())
      );

      console.log(
        `[Cron] Sending daily reminder to ${usersToNotify.length} user(s)`
      );

      // Send push to each qualifying user
      await Promise.allSettled(
        usersToNotify.map((user) =>
          sendPushToUser(user._id, {
            title: "💸 Expense Reminder",
            body:  "You haven't logged any expenses today. Tap to add one now!",
            tag:   "daily-reminder",
            url:   "/",
          })
        )
      );
    } catch (err) {
      console.error("[Cron] Daily reminder job error:", err.message);
    }
  });

  console.log("[Cron] Daily reminder scheduled at 20:00 IST (14:30 UTC)");
};

module.exports = { startDailyReminderJob };
