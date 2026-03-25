import type { Notification, Severity } from '../types';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

interface ExtendedNotification extends Notification {
  oneSignalId?: string;
}

// A helper function to queue commands until the OneSignal SDK is ready.
const safeOneSignal = (fn: (oneSignal: any) => void) => {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(fn);
};

export class OneSignalService {
  private static instance: OneSignalService;

  public static getInstance(): OneSignalService {
    if (!OneSignalService.instance) {
      OneSignalService.instance = new OneSignalService();
    }
    return OneSignalService.instance;
  }

  private isPushSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      window.isSecureContext
    );
  }

  login(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isPushSupported()) {
        console.warn('🔔 Push notifications are not supported in this browser.');
        return resolve();
      }
      safeOneSignal(async (OneSignal) => {
        try {
          console.log(`🔔 Logging into OneSignal with external user ID: ${userId}`);
          await OneSignal.login(userId);
          console.log('✅ Successfully logged in to OneSignal');
          resolve();
        } catch (error) {
          console.error('❌ Failed to login to OneSignal:', error);
          reject(error);
        }
      });
    });
  }

  logout(): Promise<void> {
    return new Promise((resolve, reject) => {
      safeOneSignal(async (OneSignal) => {
        try {
          await OneSignal.logout();
          console.log('✅ Successfully logged out from OneSignal');
          resolve();
        } catch (error) {
          console.error('❌ Failed to logout from OneSignal:', error);
          reject(error);
        }
      });
    });
  }

  setupForegroundNotifications(callback: (notification: ExtendedNotification) => void): void {
    safeOneSignal((OneSignal) => {
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
          console.log('🔔 Foreground notification received:', event);
          try {
            event.preventDefault();
          } catch (e) {
            console.warn("⚠️ Browser does not support preventing default notification display.", e);
          }
          const notificationData: ExtendedNotification = {
            id: event.notification?.notificationId || `fg-${Date.now()}`,
            oneSignalId: event.notification?.notificationId,
            title: event.notification?.title || 'Notification',
            message: event.notification?.body || '',
            severity: 'medium', 
            comments: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            type: event.notification?.additionalData?.type || 'server_alert',
            timestamp: new Date().toISOString(),
            site: event.notification?.additionalData?.site || null,
            topic_id: event.notification?.additionalData?.topic_id || null,
            status: event.notification?.additionalData?.status || 'new',
          };

          callback(notificationData);
        });
    });
  }
  
  async requestNotificationPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      safeOneSignal(async (OneSignal) => {
        try {
          const permission = await OneSignal.Notifications.requestPermission();
          resolve(permission);
        } catch (error) {
          console.error('❌ Failed to request notification permission:', error);
          reject(false);
        }
      });
    });
  }

  async isSubscribed(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      safeOneSignal(async (OneSignal) => {
        try {
          resolve(OneSignal.User.PushSubscription.optedIn);
        } catch (error) {
           console.error('❌ Failed to check subscription status:', error);
           reject(false);
        }
      });
    });
  }

  async subscribe(): Promise<string | null> {
    if (!this.isPushSupported()) {
      throw new Error('Push notifications are not supported in this browser.');
    }

    const hasPermission = await this.requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission was not granted.');
    }

    return new Promise((resolve, reject) => {
      safeOneSignal(async (OneSignal) => {
        try {
          await OneSignal.User.PushSubscription.optIn();
          const playerId = OneSignal.User.PushSubscription.id;
           if (playerId) {
            console.log('✅ Successfully subscribed with player ID:', playerId);
            resolve(playerId);
          } else {
            // This case can happen if the user opts in but the backend registration takes time.
            // We will listen for the change event to get the player ID.
            const listener = (change: any) => {
                if (change.current.id) {
                    console.log('✅ Player ID obtained after change event:', change.current.id);
                    OneSignal.User.PushSubscription.removeEventListener('change', listener);
                    resolve(change.current.id);
                }
            };
            OneSignal.User.PushSubscription.addEventListener('change', listener);
          }
        } catch (error) {
          console.error('❌ Failed to subscribe:', error);
          reject(error);
        }
      });
    });
  }

  unsubscribe(): Promise<void> {
    return new Promise((resolve, reject) => {
      safeOneSignal(async (OneSignal) => {
        try {
          await OneSignal.User.PushSubscription.optOut();
          console.log('✅ Successfully unsubscribed.');
          resolve();
        } catch (error) {
          console.error('❌ Failed to unsubscribe:', error);
          reject(error);
        }
      });
    });
  }

  setUserTags(tags: Record<string, string>): void {
    safeOneSignal((OneSignal) => OneSignal.User.addTags(tags));
  }

  removeUserTags(tagKeys: string[]): void {
    safeOneSignal((OneSignal) => OneSignal.User.removeTags(tagKeys));
  }

  onSubscriptionChange(callback: (isSubscribed: boolean) => void): void {
    safeOneSignal((OneSignal) => {
      OneSignal.User.PushSubscription.addEventListener('change', (change: any) => {
        callback(change.current.optedIn);
      });
    });
  }
}
