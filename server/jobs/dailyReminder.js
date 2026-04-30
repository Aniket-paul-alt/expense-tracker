const cron = require("node-cron");
const User = require("../models/user.model");
const Expense = require("../models/expense.model");
const PushSubscription = require("../models/pushSubscription.model");
const { sendPushToUser } = require("../utils/sendPush");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns current IST time as "HH:MM" (zero-padded). */
const getCurrentISTTime = () => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const hh = String(nowIST.getUTCHours()).padStart(2, "0");
  const mm = String(nowIST.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

/** Returns {startOfDay, endOfDay} in UTC for today's IST calendar date. */
const getISTDayBounds = () => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);

  const midnightIST = new Date(
    Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 0, 0, 0)
  );
  const endIST = new Date(
    Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate(), 23, 59, 59, 999)
  );

  return {
    startOfDay: new Date(midnightIST.getTime() - IST_OFFSET_MS),
    endOfDay:   new Date(endIST.getTime()   - IST_OFFSET_MS),
  };
};

// ─── Core job logic ───────────────────────────────────────────────────────────
// `istTime` — "HH:MM" to match against. Defaults to the current IST minute.
// Exported so the manual test endpoint can inject a specific time.

const runDailyReminderJob = async (istTime) => {
  const matchTime = istTime || getCurrentISTTime();
  console.log(`\n[DailyReminder] ▶ Checking reminderTime="${matchTime}" at ${new Date().toISOString()}`);

  try {
    // ── Step 1: Find subscribed users whose reminder time matches NOW ─────────
    // First get all userIds that have a subscription in DB
    const subscribedUserIds = await PushSubscription.distinct("userId");
    if (!subscribedUserIds.length) {
      console.log("[DailyReminder] No subscriptions — skipping.");
      return;
    }

    // Query users whose reminderTime matches the current minute AND have reminder enabled
    const users = await User.find({
      _id: { $in: subscribedUserIds },
      // reminderTime matches (or field absent → treat as default "20:00")
      $or: [
        { "preferences.reminderTime": matchTime },
        // Existing users without the field set default to "20:00"
        ...(matchTime === "20:00"
          ? [{ "preferences.reminderTime": { $exists: false } }]
          : []),
      ],
      // dailyReminder must not be explicitly set to false
      "preferences.dailyReminder": { $ne: false },
    }).select("_id name preferences");

    if (!users.length) {
      // Totally normal — most minutes nobody has their alarm set to this time
      return;
    }

    console.log(`[DailyReminder] ✅ ${users.length} user(s) have reminder at ${matchTime}:`);
    users.forEach((u) =>
      console.log(`[DailyReminder]   • ${u.name} (${u._id}) reminderTime=${u.preferences?.reminderTime || "20:00 (default)"}`)
    );

    // ── Step 2: Find who already logged expenses today (IST day) ─────────────
    const { startOfDay, endOfDay } = getISTDayBounds();
    const usersWithExpensesToday = await Expense.distinct("userId", {
      userId: { $in: users.map((u) => u._id) },
      date:   { $gte: startOfDay, $lte: endOfDay },
    });

    const expensedSet = new Set(usersWithExpensesToday.map((id) => id.toString()));
    console.log(`[DailyReminder] 💰 Already logged today: ${usersWithExpensesToday.length}`);

    // ── Step 3: Notify those who have NOT logged today ────────────────────────
    const usersToNotify = users.filter((u) => !expensedSet.has(u._id.toString()));
    console.log(`[DailyReminder] 🔔 Sending to ${usersToNotify.length} user(s)`);

    if (!usersToNotify.length) {
      console.log("[DailyReminder] ✅ Everyone logged today — no reminders needed.");
      return;
    }

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
      `[DailyReminder] 📤 Done — Success: ${results.length - failed.length}, Failed: ${failed.length}`
    );
    failed.forEach((f, i) =>
      console.error(`[DailyReminder]   ✗ Failure #${i + 1}:`, f.reason)
    );

  } catch (err) {
    console.error("[DailyReminder] ❌ Unexpected error:", err);
  }
};

// ─── Schedule ─────────────────────────────────────────────────────────────────
// Runs every minute. Each tick is a fast indexed query that exits in ~3ms when
// no users have their reminderTime set to the current minute.
// Only does real work once per day per user, at their chosen time.

const startDailyReminderJob = () => {
  cron.schedule("* * * * *", () => runDailyReminderJob(), { timezone: "UTC" });
  console.log("[DailyReminder] ⏰ Scheduled — runs every minute, matches users by their chosen IST time");
};

module.exports = { startDailyReminderJob, runDailyReminderJob };
