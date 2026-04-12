const express = require("express");
const router = express.Router();

const {
  getOverview,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
  getCategoryAnalytics,
} = require("../controllers/analytics.controller.js");

const { protect } = require("../middlewares/auth.middleware.js");

router.use(protect);

router.get("/overview",              getOverview);
router.get("/daily",                 getDailyAnalytics);
router.get("/weekly",                getWeeklyAnalytics);
router.get("/monthly",               getMonthlyAnalytics);
router.get("/yearly",                getYearlyAnalytics);
router.get("/category/:category",    getCategoryAnalytics);

module.exports = router;