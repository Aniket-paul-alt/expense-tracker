const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const webpush = require('web-push');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// ─── Configure VAPID for Web Push (legacy fallback) ───────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@expense-tracker.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('[Push] VAPID configured ✅');
} else {
  console.warn('[Push] VAPID keys not set — web-push fallback will not work');
}

// ─── Initialise Firebase Admin (FCM) ─────────────────────────────────────────
const { initAdmin } = require('./utils/fcmSend');
initAdmin(); // runs once; logs warning if env vars are absent


app.get('/', (req, res) => {
    res.send('Hello World!');
});

connectDB();

// Import routes
const authRoutes     = require('./routes/auth.router');
const expenseRoutes  = require('./routes/expense.router');
const analyticsRoutes = require('./routes/analytics.router');
const budgetRoutes   = require('./routes/budget.router');
const pushRoutes     = require('./routes/push.router');
const notificationRoutes = require('./routes/notification.routes');

// Mount routes
app.use('/api/auth',      authRoutes);
app.use('/api/expenses',  expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets',   budgetRoutes);
app.use('/api/push',      pushRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Start scheduled jobs ─────────────────────────────────────────────────────
const { startDailyReminderJob } = require('./jobs/dailyReminder');
startDailyReminderJob();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});