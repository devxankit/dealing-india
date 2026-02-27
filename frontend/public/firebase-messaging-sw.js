importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

const ENABLE_FCM = false;

if (ENABLE_FCM) {
  const firebaseConfig = {
    messagingSenderId: "237174767048",
  };

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
