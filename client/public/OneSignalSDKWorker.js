self.addEventListener('install', () => self.skipWaiting());

/* MCM Alerts Native Service Worker (Integrated with OneSignal) */
// MCM Alerts Logic: MUST be at the top to satisfy 'initial evaluation' checks.
self.addEventListener('message', (event) => {
    if (event.data?.type === 'CLEAR_BADGE') {
        if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
    }
});

// Load OneSignal Logic AFTER our listeners are registered
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
