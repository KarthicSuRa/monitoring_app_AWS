importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

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

  // Forward the background push to any open app clients so it appears in the in-app toast list
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin)) {
        client.postMessage({ 
          type: 'PUSH_NOTIFICATION', 
          notification: {
            id: payload.messageId || `bg-${Date.now()}`,
            title: notificationTitle,
            message: notificationOptions.body,
            severity: payload.data?.severity || 'high',
            type: 'push',
            timestamp: new Date().toISOString(),
            topic_id: payload.data?.topic_id || null,
            status: 'new'
          }
        });
      }
    }
  });

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Open (or focus) the app when the user clicks a push notification
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});