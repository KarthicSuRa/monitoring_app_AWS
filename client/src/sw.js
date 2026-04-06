import { precacheAndRoute } from 'workbox-precaching';

// The self.__WB_MANIFEST is a placeholder that will be replaced by the Workbox build process
// with a list of assets to precache.
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    self.registration.setAppBadge(0).catch(e => console.error('Clearing badge failed', e));
  }
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'MCM-Alerts';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: './icons/icon-192x192.png', 
    badge: './icons/badge-72x72.png', 
    data: {
      url: data.url || self.location.origin, 
    },
  };

  // Show the system notification
  const notificationPromise = self.registration.showNotification(title, options);
  event.waitUntil(notificationPromise);

  // Broadcast the notification to all open clients
  const broadcastPromise = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clients => {
    if (clients) {
      clients.forEach(client => {
        client.postMessage({ type: 'PUSH_NOTIFICATION', notification: data });
      });
    }
  });
  event.waitUntil(broadcastPromise);

  // Update the app badge
  if (self.registration.setAppBadge) {
    self.clients.matchAll().then(clients => {
      if (clients.length === 0) { // Only set badge if app is not in foreground
        self.registration.setAppBadge(1).catch(e => console.error('Setting badge failed', e));
      }
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data.url;

  event.notification.close(); // Close the notification

  // Open the URL associated with the notification
  event.waitUntil(
    self.clients.openWindow(url)
  );
});
