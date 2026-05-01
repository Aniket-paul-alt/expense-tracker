/**
 * Generates a fresh VAPID key pair.
 * Run: node server/scripts/generateVapidKeys.js
 * Then copy the output into:
 *   - Render env vars: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
 *   - Netlify env vars: VITE_VAPID_PUBLIC_KEY  (public key only)
 */
const webpush = require("web-push");
const keys = webpush.generateVAPIDKeys();

console.log("\n=== VAPID Key Pair (copy these into your env vars) ===\n");
console.log("VAPID_PUBLIC_KEY  =", keys.publicKey);
console.log("VAPID_PRIVATE_KEY =", keys.privateKey);
console.log("\nVITE_VAPID_PUBLIC_KEY =", keys.publicKey, "  ← set this on Netlify");
console.log("\n⚠️  After updating env vars: wipe subscriptions and re-subscribe on your phone.\n");
