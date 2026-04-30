const cron = require("node-cron");
const User = require("../models/user.model");
const Expense = require("../models/expense.model");
const PushSubscription = require("../models/pushSubscription.model");
const { sendPushToUser } = require("../utils/sendPush");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns {startOfDay, endOfDay} in IST (UTC+5:30) for the current moment.
 * The server (Render) runs in UTC, so we must manually offset.
 */
const getISTDayBounds = () => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m in ms
  const nowUTC = Date.now();
  const nowIST = new Date(nowUTC + IST_OFFSET_MS);

  // Midnight and end-of-day in IST, then convert back to UTC for Mongo queries
  const midnightIST = new Date(
    Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 0, 0, 0)
  );
  const endIST = new Date(
    Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 23, 59, 59, 999)
  );

  // Convert IST midnight/end back to actual UTC timestamps
  const startOfDay = new Date(midnightIST.getTime() - IST_OFFSET_MS);
  const endOfDay   = new Date(endIST.getTime()   - IST_OFFSET_MS);

  return { startOfDay, endOfDay };
};

// ─── Core job logic (exported so it can be triggered manually for testing) ────

const runDailyReminderJob = async () => {
  const jobStart = new Date().toISOString();
  console.log(`\n========================================`);
  console.log(`[DailyReminder] ▶ Job started at ${jobStart}`);

  try {
    // ── Step 1: Find all users with at least one push subscription ────────────
    const subscribedUserIds = await PushSubscription.distinct("userId");
    console.log(`[DailyReminder] 📋 Total subscribed userIds: ${subscribedUserIds.length}`);

    if (!subscribedUserIds.length) {
      console.log("[DailyReminder] ⚠️  No subscriptions in DB — aborting.");
      return;
    }

    // ── Step 2: Filter to users who have dailyReminder enabled ───────────────
    // We fetch ALL subscribed users and filter in JS to avoid Mongo dot-path
    // ambiguity when preferences is absent entirely.
    const users = await User.find({
      _id: { $in: subscribedUserIds },
    }).select("_id name preferences");

    console.log(`[DailyReminder] 👥 Users fetched from DB: ${users.length}`);

    // Log each user's dailyReminder preference for debugging
    users.forEach((u) => {
      const pref = u.preferences?.dailyReminder;
      console.log(
        `[DailyReminder]   • ${u.name} (${u._id}) — preferences.dailyReminder = ${pref}`
      );
    });

    // Keep only users who have dailyReminder enabled (or not explicitly disabled)
    const eligibleUsers = users.filter((u) => {
      const val = u.preferences?.dailyReminder;
      // true OR undefined/null (not explicitly set to false)
      return val !== false;
    });
    console.log(`[DailyReminder] ✅ Eligible users (reminder not disabled): ${eligibleUsers.length}`);

    if (!eligibleUsers.length) {
      console.log("[DailyReminder] ⚠️  No eligible users — all have disabled daily reminder.");
      return;
    }

    // ── Step 3: Compute today's IST date window ────────────────────────────────
    const { startOfDay, endOfDay } = getISTDayBounds();
    console.log(`[DailyReminder] 🕐 IST day window:`);
    console.log(`[DailyReminder]   startOfDay (UTC) = ${startOfDay.toISOString()}`);
    console.log(`[DailyReminder]   endOfDay   (UTC) = ${endOfDay.toISOString()}`);

    // ── Step 4: Find who already logged expenses in this IST day ─────────────
    const usersWithExpensesToday = await Expense.distinct("userId", {
      userId: { $in: eligibleUsers.map((u) => u._id) },
      date:   { $gte: startOfDay, $lte: endOfDay },
    });

    const expensedSet = new Set(usersWithExpensesToday.map((id) => id.toString()));
    console.log(
      `[DailyReminder] 💰 Users who already logged today: ${usersWithExpensesToday.length}` +
      (usersWithExpensesToday.length ? ` [${[...expensedSet].join(", ")}]` : "")
    );

    // ── Step 5: Filter to users who have NOT logged today ─────────────────────
    const usersToNotify = eligibleUsers.filter(
      (u) => !expensedSet.has(u._id.toString())
    );
    console.log(`[DailyReminder] 🔔 Users to notify: ${usersToNotify.length}`);
    usersToNotify.forEach((u) =>
      console.log(`[DailyReminder]   → Sending reminder to ${u.name} (${u._id})`)
    );

    if (!usersToNotify.length) {
      console.log("[DailyReminder] ✅ Everyone logged expenses today — no reminders needed.");
      return;
    }

    // ── Step 6: Send push notifications ───────────────────────────────────────
    const results = await Promise.allSettled(
      usersToNotify.map((user) =>
        sendPushToUser(user._id, {
          title: "💸 Expense Reminder",
          body:  "You haven't logged any expenses today. Tap to add one now!",
          tag:   "daily-reminder",
          url:   "/",
        })
      )
    );

    const failed = results.filter((r) => r.status === "rejected");
    console.log(
      `[DailyReminder] 📤 Notifications sent. Success: ${results.length - failed.length}, Failed: ${failed.length}`
    );
    failed.forEach((f, i) =>
      console.error(`[DailyReminder]   ✗ Failure #${i + 1}:`, f.reason)
    );

  } catch (err) {
    console.error("[DailyReminder] ❌ Unexpected error:", err);
  }

  console.log(`[DailyReminder] ■ Job finished at ${new Date().toISOString()}`);
  console.log(`========================================\n`);
};

// ─── Schedule the job ─────────────────────────────────────────────────────────
// 20:00 IST = 14:30 UTC  →  cron: "30 14 * * *"

const startDailyReminderJob = () => {
  // "30 14 * * *" = 14:30 UTC = 20:00 IST every day
  cron.schedule("30 14 * * *", runDailyReminderJob, {
    timezone: "UTC", // explicitly UTC so Render's timezone setting can't shift it
  });

  console.log("[DailyReminder] ⏰ Scheduled at 14:30 UTC (20:00 IST) daily");
};

module.exports = { startDailyReminderJob, runDailyReminderJob };
