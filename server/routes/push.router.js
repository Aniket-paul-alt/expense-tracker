const express = require("express");
const router  = express.Router();

const { 
  getVapidPublicKey, 
  getFirebaseConfig, 
  subscribe, 
  unsubscribe, 
  getPushStatus 
} = require("../controllers/push.controller");
const { protect } = require("../middlewares/auth.middleware");

// Public — client needs these to initialise push notifications
router.get("/vapid-key",       getVapidPublicKey);
router.get("/firebase-config", getFirebaseConfig);
router.get("/status",          getPushStatus);

// Protected
router.post("/subscribe",    protect, subscribe);
router.delete("/unsubscribe", protect, unsubscribe);

module.exports = router;
