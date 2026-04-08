importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA7p75CN43xLBQLr4K7wa4Bb3N8zFUHe8c",
  authDomain: "mcm-push.firebaseapp.com",
  projectId: "mcm-push",
  storageBucket: "mcm-push.firebasestorage.app",
  messagingSenderId: "730912482480",
  appId: "1:730912482480:web:4b77062aa115335e19c775",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Received background message:', payload);

  // Extract content from either 'notification' object or 'data' object
  const notificationTitle = payload.notification?.title || payload.data?.title || 'MCM Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'New system update.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'mcm-notification', // Replaces old notification with new one
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});