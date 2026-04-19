const express = require("express");
const router  = express.Router();

const { getVapidPublicKey, subscribe, unsubscribe } = require("../controllers/push.controller");
const { protect } = require("../middlewares/auth.middleware");

// Public — client needs this key to call PushManager.subscribe()
router.get("/vapid-key", getVapidPublicKey);

// Protected
router.post("/subscribe",    protect, subscribe);
router.delete("/unsubscribe", protect, unsubscribe);

module.exports = router;
