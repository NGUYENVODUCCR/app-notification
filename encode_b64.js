const fs = require('fs');

// Đọc file gốc
const content = fs.readFileSync('firebase-service-account.json', 'utf8');

// Mã hóa Base64
const b64 = Buffer.from(content, 'utf8').toString('base64');

// Ghi ra file
fs.writeFileSync('firebase.b64', b64);
console.log('Đã tạo firebase.b64');
