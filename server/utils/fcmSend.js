const admin = require("firebase-admin");

let _adminReady = false;

const initAdmin = () => {
  if (_adminReady) return true;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn("[FCM] Firebase Admin env vars not set — FCM disabled.");
    return false;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  _adminReady = true;
  console.log("[FCM] Firebase Admin initialised ✅");
  return true;
};

const sendFCMToToken = async (fcmToken, { title, body, icon, badge, tag, url }) => {
  if (!initAdmin()) return { success: false };

  const message = {
    token: fcmToken,

    // ── notification field ── Chrome auto-displays this even when app is killed
    // This is the most reliable delivery method for Android web push.
    notification: { title, body },

    // ── webpush config ── controls how it looks in the browser notification
    webpush: {
      notification: {
        title,
        body,
        icon:      icon  || "/icons/pwa-192x192.png",
        badge:     badge || "/icons/pwa-192x192.png",
        tag:       tag   || "expense-tracker",
        renotify:  true,
      },
      // data is passed to the push event in the service worker
      data: {
        title,
        body,
        icon:  icon  || "/icons/pwa-192x192.png",
        badge: badge || "/icons/pwa-192x192.png",
        tag:   tag   || "expense-tracker",
        url:   url   || "/",
      },
      fcmOptions: { link: url || "/" },
      headers:    { Urgency: "high" },
    },

    android: { priority: "high" },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`[FCM] Sent ✅ token=...${fcmToken.slice(-10)} response=${response}`);
    return { success: true };
  } catch (err) {
    const stale =
      err.code === "messaging/invalid-registration-token" ||
      err.code === "messaging/registration-token-not-registered";
    console.error(`[FCM] Send error code=${err.code} message=${err.message}`);
    return { success: false, stale, code: err.code };
  }
};

module.exports = { sendFCMToToken, initAdmin };
