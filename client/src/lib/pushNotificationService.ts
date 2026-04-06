
import { apiClient } from './apiClient';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export class PushNotificationService {
    private static instance: PushNotificationService;
    private readonly VAPID_PUBLIC_KEY = "BJ5aM9g-8KVE2t2a-imcXpOF1K3LePPf300L4Bwto4if3hF0D24j6qf0JprYyWyJ3-M8qd38128eDBlC3s2y-HU";

    private constructor() {}

    public static getInstance(): PushNotificationService {
        if (!PushNotificationService.instance) {
          PushNotificationService.instance = new PushNotificationService();
        }
        return PushNotificationService.instance;
      }

      private isPushSupported(): boolean {
        return 'serviceWorker' in navigator && 'PushManager' in window;
      }

      public async getSubscription(): Promise<PushSubscription | null> {
        if (!this.isPushSupported()) {
          return null;
        }
        try {
          const registration = await navigator.serviceWorker.ready;
          return registration.pushManager.getSubscription();
        } catch (error) {
            console.error("Failed to get service worker registration:", error)
            return null;
        }
      }

      async subscribe(): Promise<PushSubscription | null> {
        if (!this.isPushSupported()) {
          console.error("Push notifications are not supported in this browser.");
          throw new Error("Push notifications not supported.");
        }

        let subscription = await this.getSubscription();

        if (subscription) {
          console.log("User is already subscribed.");
          return subscription;
        }

        try {
          const registration = await navigator.serviceWorker.ready;
          const applicationServerKey = urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY) as any;
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey,
          });

          console.log("User subscribed successfully:", subscription);
          // The backend expects the endpoint to be sent as `token`.
          await apiClient.post('/push-subscriptions', { token: subscription.endpoint });
          return subscription;
        } catch (error) {
          console.error("Failed to subscribe the user:", error);
          throw error;
        }
      }

      async unsubscribe(): Promise<void> {
        const subscription = await this.getSubscription();

        if (subscription) {
          try {
            // The backend expects the token as a query parameter for DELETE requests.
            await apiClient.delete(`/push-subscriptions?token=${encodeURIComponent(subscription.endpoint)}`);
            await subscription.unsubscribe();
            console.log('User unsubscribed successfully.');
          } catch (error) {
            console.error('Failed to unsubscribe the user:', error);
            throw error;
          }
        }
      }
}

export const pushNotificationService = PushNotificationService.getInstance();
