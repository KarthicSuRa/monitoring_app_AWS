// public/firebase-messaging-sw.js
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

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Payload received:', payload);

  // Relay to app when user comes back to the tab
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({
      type: 'PUSH_NOTIFICATION',
      notification: {
        id: payload.data?.id || `push-${Date.now()}`,
        title: payload.data?.title || 'MCM Alert',
        message: payload.data?.message || '',
        severity: payload.data?.severity || 'high',
        type: 'push',
        timestamp: new Date().toISOString(),
        site: null,
        comments: [],
        topic_id: payload.data?.topic_id || null,
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }));
  });

  const title = payload.data?.title || "MCM Alert";
  const body = payload.data?.message || "New update received";

  const notificationOptions = {
    body: body,
    icon: payload.data?.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: `mcm-${Date.now()}`,
    renotify: true,
    requireInteraction: true,  // stays until user dismisses
    vibrate: [200, 100, 200],  // explicit vibration pattern
    sound: 'default',
    data: {
      url: payload.data?.click_action || '/'
    },
    actions: [
      { action: 'open', title: 'View Dashboard' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

// 4. Handle notification clicks (Teams style)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
