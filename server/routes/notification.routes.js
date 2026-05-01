const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllRead,
  clearNotifications,
} = require("../controllers/notification.controller");
const { protect } = require("../middlewares/auth.middleware");

router.use(protect);

router.get("/", getNotifications);
router.delete("/", clearNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markAsRead);

// ─── Debug: manually trigger the daily reminder job ───────────────────────────
// POST /api/notifications/test-daily-reminder?time=HH:MM
// - Without ?time → matches users whose reminderTime == current IST minute
// - With ?time=20:00 → matches users whose reminderTime == "20:00"
router.post("/test-daily-reminder", async (req, res) => {
  try {
    const { runDailyReminderJob } = require("../jobs/dailyReminder");
    const istTime = req.query.time || null; // e.g. "20:00"
    console.log(
      `[Debug] Manual daily-reminder trigger by user ${req.user._id}` +
      (istTime ? ` for time=${istTime}` : " (current IST time)")
    );
    runDailyReminderJob(istTime).catch((e) =>
      console.error("[Debug] runDailyReminderJob failed:", e)
    );
    res.json({
      ok: true,
      message: `Daily reminder job triggered for time=${istTime || "current IST minute"} — check server logs.`,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Debug: send a raw push directly to the current user ─────────────────────
// POST /api/notifications/test-push
// Bypasses all time/expense checks — just sends a notification immediately.
// Use this to verify VAPID delivery is working end-to-end.
router.post("/test-push", async (req, res) => {
  try {
    const { sendPushToUser } = require("../utils/sendPush");
    console.log(`[Debug] Direct push test for user ${req.user._id}`);
    await sendPushToUser(req.user._id, {
      title: "🔔 Test Notification",
      body:  "VAPID push is working! Background delivery confirmed ✅",
      tag:   "test-push",
      url:   "/",
    });
    res.json({ ok: true, message: "Push sent — check your phone!" });
  } catch (err) {
    console.error("[Debug] test-push failed:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

