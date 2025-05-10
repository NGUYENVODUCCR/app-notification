// index.js
const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cors = require("cors");

// 1. Đọc chuỗi Base64 từ ENV và giải mã
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable");
  process.exit(1);
}

let serviceAccount;
try {
  const jsonString = Buffer
    .from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64")
    .toString("utf8");
  serviceAccount = JSON.parse(jsonString);
} catch (err) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:", err);
  process.exit(1);
}

// 2. Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;
  const message = { notification: { title, body }, token };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).send({ success: true, response });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
