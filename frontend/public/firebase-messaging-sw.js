importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

const ENABLE_FCM = true;

if (ENABLE_FCM) {
  try {
    // Firebase requires apiKey + projectId; messagingSenderId alone causes SW evaluation to fail
    const firebaseConfig = self.__FIREBASE_CONFIG__ || { messagingSenderId: "237174767048" };
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      firebase.initializeApp(firebaseConfig);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
          body: payload.notification.body,
          icon: payload.notification.icon || "/favicon.png",
          data: payload.data,
          requireInteraction: true,
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  } catch (e) {
    console.warn("[FCM SW] Init failed:", e?.message || e);
  }

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const data = event.notification.data;
    const urlToOpen = data?.link || "/";
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === urlToOpen && "focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        }),
    );
  });
}
