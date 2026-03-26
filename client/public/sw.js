// Service Worker - Plain JS (no ESM imports, no bundler required)
// CRITICAL: All addEventListener calls MUST be at the TOP LEVEL (synchronous).
// Any async gap (like an ESM import) delays registration past the initial evaluation
// window, causing the browser to warn: "Event handler of 'message' event must be
// added on the initial evaluation of worker script."
// ─── MESSAGE HANDLER ───────────────────────────────────────────────────────────
// HOW IT WORKS: App sends postMessage({ type: 'SKIP_WAITING' }) to update the SW
// immediately. App sends postMessage({ type: 'CLEAR_BADGE' }) when it becomes visible.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
  }
});
// ─── INSTALL ───────────────────────────────────────────────────────────────────
// HOW IT WORKS: skipWaiting() makes the new SW activate immediately without waiting
// for existing tabs to close. This ensures push handler is always up to date.
self.addEventListener('install', () => {
  self.skipWaiting();
});
// ─── ACTIVATE ──────────────────────────────────────────────────────────────────
// HOW IT WORKS: clients.claim() makes this SW take control of all open tabs
// immediately — otherwise the SW only controls pages opened AFTER install.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
// ─── BACKGROUND PUSH ───────────────────────────────────────────────────────────
// HOW IT WORKS: When the app is CLOSED or in the BACKGROUND, OneSignal delivers
// a raw push event to this service worker. We display an OS-level notification.
// Note: When the app is OPEN, OneSignal intercepts first and fires
// 'foregroundWillDisplay' in oneSignalService.ts instead of this handler.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'MCM Alerts';
    const options = {
      body: data.message || data.body || '',
      icon: '/icons/icon-192x192.png',   // FIXED: was pointing to root, file is in /icons/
      badge: '/icons/icon-192x192.png',
      data: data,                         // Passed to notificationclick for deep-linking
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Push data may not be JSON — silently ignore
  }
});
// ─── NOTIFICATION CLICK ────────────────────────────────────────────────────────
// HOW IT WORKS: User clicks the OS notification popup.
// 1. Close the popup
// 2. Clear the app badge
// 3. If app is already open in a tab → focus that tab
//    If app is not open → open a new tab at '/'
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch(() => {});
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow('/');
      })
  );
});