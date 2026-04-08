import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA7p75CN43xLBQLr4K7wa4Bb3N8zFUHe8c",
  authDomain: "mcm-push.firebaseapp.com",
  projectId: "mcm-push",
  storageBucket: "mcm-push.firebasestorage.app",
  messagingSenderId: "730912482480",
  appId: "1:730912482480:web:4b77062aa115335e19c775",
  measurementId: "G-Y6GZ0T0RHF"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestForToken = async (registration: ServiceWorkerRegistration) => {
  try {
    // We pass the explicit registration here to avoid the /firebase-cloud-messaging-push-scope worker
    const currentToken = await getToken(messaging, { 
      vapidKey: 'BOFiu5lB5pCf75K-Jao0CyIkEj7iIikMsZND0YZMOM72OY4iQKLfqyx49FwKzQtFp4uJZxsbO7SQ8Sa7_EB1_pM',
      serviceWorkerRegistration: registration 
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = (callback: (payload: MessagePayload) => void) => {
  return onMessage(messaging, (payload: MessagePayload) => {
    callback(payload);
  });
};