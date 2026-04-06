import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST || []);

// ─── Message Handler ──────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_BADGE') {
    self.registration.setAppBadge(0).catch(() => {});
  }
});

// ─── Push Handler (FCM v1 via SNS) ───────────────────────────────────────
/**
 * SNS delivers the FCM v1 "default" text as the push payload to the browser.
 * However when the service worker receives the push event, the data is the
 * raw FCM data payload object (the `data` field from the FCM message).
 *
 * Structure received from FCM v1 via SNS:
 * {
 *   notificationId,  severity,  type,  topic_id,  status,  created_at,  click_action
 * }
 * The notification title/body come from the FCM `notification` object — these
 * are injected by FCM directly into the push event and accessible via
 * event.data.json() which for web push returns the full notification payload.
 */
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: 'MCM Alert', body: event.data?.text() || 'New notification' };
  }

  // FCM can deliver the notification fields at top level or nested under 'notification'
  const title = payload.notification?.title || payload.title || 'MCM Alert';
  const body  = payload.notification?.body  || payload.body  || 'You have a new notification.';
  const data  = payload.data || payload; // extra data fields
  const clickUrl = data.click_action || data.notificationId
    ? `${self.location.origin}/#notifications`
    : self.location.origin;

  const options = {
    body,
    icon: '/mcm-logo.png',
    badge: '/badge-icon.png',
    tag: data.notificationId || 'mcm-alert',
    renotify: true,
    data: {
      url: clickUrl,
      notificationId: data.notificationId,
      severity: data.severity || 'medium',
      type: data.type || 'general',
    },
    actions: [
      { action: 'view',    title: '👁 View' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
    vibrate: data.severity === 'high' ? [200, 100, 200, 100, 200] : [200],
    requireInteraction: data.severity === 'high',
  };

  event.waitUntil(
    Promise.all([
      // Show the system notification
      self.registration.showNotification(title, options),

      // Broadcast to all open app windows (in-app notification bell update)
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION',
            notification: {
              id: data.notificationId,
              title,
              body,
              severity: data.severity,
              topic_id: data.topic_id,
              created_at: data.created_at || new Date().toISOString(),
            },
          });
        });
      }),

      // Update app badge when app is in background
      self.clients.matchAll().then((clients) => {
        if (clients.length === 0 && self.registration.setAppBadge) {
          self.registration.setAppBadge(1).catch(() => {});
        }
      }),
    ])
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || self.location.origin;
  const notificationId = event.notification.data?.notificationId;

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      const existing = clients.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'NAVIGATE_TO_NOTIFICATION', notificationId });
        return;
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
