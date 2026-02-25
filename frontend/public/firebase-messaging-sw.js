importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

const firebaseConfig = {
  apiKey: "AIzaSyBxIBqCVsS2UWkEd1glL3QIE4ZmM8465ac",
  authDomain: "dealing-india-c5fec.firebaseapp.com",
  projectId: "dealing-india-c5fec",
  storageBucket: "dealing-india-c5fec.firebasestorage.app",
  messagingSenderId: "237174767048",
  appId: "1:237174767048:web:81f50487a4bf163331d4fd",
  measurementId: "G-80SVW67C2L",
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
