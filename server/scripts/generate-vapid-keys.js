/**
 * One-time script to generate VAPID keys for Web Push.
 * Run: node server/scripts/generate-vapid-keys.js
 * Then copy the output into your .env files.
 */

const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("\n✅ VAPID keys generated — copy these into your .env files:\n");
console.log("# server/.env");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your@email.com`);
console.log("\n# client/.env");
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(
  "\n⚠️  Keep VAPID_PRIVATE_KEY secret — never commit it to git!\n"
);
