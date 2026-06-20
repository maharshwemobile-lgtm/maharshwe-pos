/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyAK8Kcd7J5dShAqn2QlJmAZFeJRVg1mfOw',
  authDomain: 'maharshweonlinevpn.firebaseapp.com',
  projectId: 'maharshweonlinevpn',
  storageBucket: 'maharshweonlinevpn.firebasestorage.app',
  messagingSenderId: '648689584934',
  appId: '1:648689584934:web:47f1ee30f86090fb32cfe7',
  measurementId: 'G-DW2DHE0211',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

function notificationUrl(payload) {
  const dataUrl = payload?.data?.url || payload?.notification?.click_action || '/';
  try {
    if (/^https?:\/\//i.test(dataUrl)) return dataUrl;
    return new URL(dataUrl || '/', self.location.origin).href;
  } catch {
    return self.location.origin;
  }
}

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || 'Mahar POS';
  const body = payload?.notification?.body || payload?.data?.body || 'Open Mahar POS to review.';
  const url = notificationUrl(payload);

  self.registration.showNotification(title, {
    body,
    icon: '/maharshwe-logo.png',
    badge: '/maharshwe-logo.png',
    tag: payload?.data?.eventType || 'mahar-pos',
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || self.location.origin;
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clientsList.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'MAHAR_PUSH_OPEN', url: targetUrl });
      return;
    }
    await clients.openWindow(targetUrl);
  })());
});
