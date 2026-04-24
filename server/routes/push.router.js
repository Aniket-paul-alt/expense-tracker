const express = require("express");
const router  = express.Router();

const { getVapidPublicKey, getFirebaseConfig, subscribe, unsubscribe } = require("../controllers/push.controller");
const { protect } = require("../middlewares/auth.middleware");

// Public — client needs these to initialise push notifications
router.get("/vapid-key",       getVapidPublicKey);
router.get("/firebase-config", getFirebaseConfig);

// Protected
router.post("/subscribe",    protect, subscribe);
router.delete("/unsubscribe", protect, unsubscribe);

module.exports = router;
