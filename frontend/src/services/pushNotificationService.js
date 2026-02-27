import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import api from "../shared/utils/api";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const ENABLE_FCM = false;

async function registerServiceWorker() {
  if (!ENABLE_FCM) return null;
  if ("serviceWorker" in navigator) {
    console.log("[FCM] Registering service worker");
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );
    console.log("[FCM] Service worker registered", { scope: registration.scope });
    return registration;
  }
  throw new Error("Service Workers are not supported");
}

async function requestNotificationPermission() {
  if (!ENABLE_FCM) return false;
  if ("Notification" in window) {
    console.log("[FCM] Requesting notification permission");
    const permission = await Notification.requestPermission();
    console.log("[FCM] Notification permission result", { permission });
    return permission === "granted";
  }
  return false;
}

async function getFCMToken() {
  if (!ENABLE_FCM) return null;
  const registration = await registerServiceWorker();
  if (!registration) return null;
  await registration.update();
  console.log("[FCM] Getting token with VAPID key");
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  console.log("[FCM] Token obtained", {
    hasToken: !!token,
    preview: token ? token.slice(0, 12) : null,
  });
  return token || null;
}

function getAuthTokenForCurrentContext() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (path.startsWith("/admin")) {
    return localStorage.getItem("admin-token");
  }
  if (path.startsWith("/b2b-vendor")) {
    return (
      localStorage.getItem("b2b-vendor-token") ||
      localStorage.getItem("vendor-token")
    );
  }
  return localStorage.getItem("token");
}

async function registerFCMToken(forceUpdate = false) {
  if (!ENABLE_FCM) return null;
  console.log("[FCM] RegisterFCMToken called", { forceUpdate });
  const savedToken = localStorage.getItem("fcm_token_web");
  if (savedToken && !forceUpdate) {
    console.log("[FCM] Token already saved in localStorage");
    return savedToken;
  }
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) throw new Error("Notification permission not granted");
  const token = await getFCMToken();
  if (!token) throw new Error("Failed to get FCM token");
  console.log("[FCM] Saving token to backend");
  try {
    const res = await api.post("/fcm-tokens/save", { token, platform: "web" });
    console.log("[FCM] Backend save response", res);
    if (!res?.success)
      throw new Error(res?.message || "Failed to register token with backend");
  } catch (err) {
    console.error("[FCM] Error saving token to backend", err?.message || err);
    throw err;
  }
  localStorage.setItem("fcm_token_web", token);
  console.log("[FCM] Token saved to localStorage");
  return token;
}

function setupForegroundNotificationHandler(handler) {
  if (!ENABLE_FCM) return;
  onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message received", payload);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || "/favicon.png",
        data: payload.data,
      });
    }
    if (handler) handler(payload);
  });
}

async function initializePushNotifications() {
  if (!ENABLE_FCM) return;
  try {
    await registerServiceWorker();
  } catch {}
}

export {
  initializePushNotifications,
  registerFCMToken,
  setupForegroundNotificationHandler,
  requestNotificationPermission,
};
