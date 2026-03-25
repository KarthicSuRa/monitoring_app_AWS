importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
import { precacheAndRoute } from 'workbox-precaching';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

precacheAndRoute(self.__WB_MANIFEST || []);
