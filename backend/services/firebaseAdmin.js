import admin from 'firebase-admin';
import fs from 'fs';

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const configJson = process.env.FIREBASE_CONFIG;
  if (configJson) {
    const creds = JSON.parse(configJson);
    admin.initializeApp({
      credential: admin.credential.cert(creds)
    });
    initialized = true;
    return;
  }
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const creds = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(creds)
    });
    initialized = true;
    return;
  }
  admin.initializeApp();
  initialized = true;
}

export async function sendPushNotification(tokens, payload) {
  initFirebaseAdmin();
  const message = {
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: payload.data || {},
    tokens
  };
  const response = await admin.messaging().sendEachForMulticast(message);
  return response;
}

