const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cors = require("cors");

// 1. Dọc chuỗi Base64 từ ENV và giải mă
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

const db = admin.firestore(); // <-- Firestore khởi tạo
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 3. Gửi và lưu notification
app.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;
  const message = { notification: { title, body }, token };

  try {
    const response = await admin.messaging().send(message);

    // Lưu vào Firestore
    await db.collection("notifications").add({
      token,
      title,
      body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send({ success: true, response });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// 4. Lấy danh sách notification có sắp xếp
app.get("/notifications", async (req, res) => {
  const sort = req.query.sort === "desc" ? "desc" : "asc";
  try {
    const snapshot = await db
      .collection("notifications")
      .orderBy("createdAt", sort)
      .get();

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 5. Tìm kiếm theo từ khóa
app.get("/notifications/search", async (req, res) => {
  const { q } = req.query;
  try {
    const snapshot = await db.collection("notifications").get();
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(n =>
        (n.title && n.title.toLowerCase().includes(q.toLowerCase())) ||
        (n.body && n.body.toLowerCase().includes(q.toLowerCase()))
      );

    res.status(200).send(results);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 6. Xóa notification theo ID
app.delete("/notifications/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await db.collection("notifications").doc(id).delete();
    res.status(200).send({ message: `Notification ${id} deleted` });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 7. Khởi chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 8. Xem chi tiết notification theo ID
app.get('/notifications/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const doc = await db.collection('notifications').doc(id).get();
    if (!doc.exists) {
      return res.status(404).send({ error: 'Notification not found' });
    }
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
