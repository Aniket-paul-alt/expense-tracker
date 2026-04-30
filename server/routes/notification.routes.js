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
// POST /api/notifications/test-daily-reminder
// Protected — only logged-in users can call it (safe for dev/staging)
router.post("/test-daily-reminder", async (req, res) => {
  try {
    const { runDailyReminderJob } = require("../jobs/dailyReminder");
    console.log(`[Debug] Manual daily-reminder trigger by user ${req.user._id}`);
    // Run async, don't await — logs will show in server console
    runDailyReminderJob().catch((e) =>
      console.error("[Debug] runDailyReminderJob failed:", e)
    );
    res.json({ ok: true, message: "Daily reminder job triggered — check server logs." });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
