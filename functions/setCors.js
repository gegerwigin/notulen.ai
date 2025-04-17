const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "sekreai.appspot.com",
});

const bucket = admin.storage().bucket();

/**
 * Set CORS configuration for Firebase Storage bucket
 * @return {Promise<void>}
 */
async function setCorsConfiguration() {
  try {
    const corsConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../cors.json"), "utf8"));
    await bucket.setCorsConfiguration(corsConfig);
    console.log("CORS configuration updated successfully");
  } catch (error) {
    console.error("Error updating CORS configuration:", error);
  }
}

setCorsConfiguration(); 