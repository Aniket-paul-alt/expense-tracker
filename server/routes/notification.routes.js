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

module.exports = router;
