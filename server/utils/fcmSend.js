const admin = require("firebase-admin");

// ─── Lazy-initialise Firebase Admin ──────────────────────────────────────────
// We initialise once and reuse. If env vars are missing we skip gracefully.

let _adminReady = false;

const initAdmin = () => {
  if (_adminReady) return true;

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn("[FCM] Firebase Admin env vars not set — FCM sending disabled.");
    return false;
  }

  // Only initialise if no default app already exists
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // Render/Netlify stores the private key with literal \n — replace them
        privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  _adminReady = true;
  console.log("[FCM] Firebase Admin initialised ✅");
  return true;
};

// ─── Send FCM notification to a single token ─────────────────────────────────

const sendFCMToToken = async (fcmToken, { title, body, icon, badge, tag, url }) => {
  if (!initAdmin()) return;

  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    webpush: {
      notification: {
        title,
        body,
        icon:  icon  || "/icons/pwa-192x192.png",
        badge: badge || "/icons/pwa-192x192.png",
        tag:   tag   || "expense-tracker",
        renotify: true,
        // Makes the notification clickable and opens the PWA
        click_action: url || "/",
      },
      fcmOptions: {
        link: url || "/",
      },
    },
    android: {
      priority: "high",
      notification: {
        title,
        body,
        icon:  "ic_notification",
        color: "#6366f1",
        tag:   tag || "expense-tracker",
        clickAction: url || "/",
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`[FCM] Sent to token ...${fcmToken.slice(-12)}: ${response}`);
    return { success: true };
  } catch (err) {
    // These codes mean the token is stale/invalid — caller should clean up
    const stale =
      err.code === "messaging/invalid-registration-token" ||
      err.code === "messaging/registration-token-not-registered";
    console.error(`[FCM] Send error (${err.code}): ${err.message}`);
    return { success: false, stale, code: err.code };
  }
};

module.exports = { sendFCMToToken, initAdmin };
