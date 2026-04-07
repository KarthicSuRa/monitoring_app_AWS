
import { config } from '../config';
import { getCurrentUser } from './cognitoClient';
import { Notification } from '../types';

const apiUrlBase = config.api.invokeUrl;

if (!apiUrlBase) {
  throw new Error('API URL is not configured in config.ts');
}

const getHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const session = await getCurrentUser();
    if (session && session.isValid()) {
      const token = session.getIdToken().getJwtToken();
      headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('No valid Cognito session found. Making unauthenticated request.');
    }
  } catch (error) {
    console.error('Error getting Cognito session:', error);
  }

  return headers;
};

const sanitizedApiUrlBase = apiUrlBase.endsWith('/') ? apiUrlBase.slice(0, -1) : apiUrlBase;

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('API Error Response:', errorBody);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("Failed to parse JSON response:", text);
    return {}; // Return empty object for non-json responses or parse errors
  }
};

export const apiClient = {
  get: async (path: string) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, { headers });
    return handleResponse(response);
  },
  post: async (path: string, body: any) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },
  put: async (path: string, body: any) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },
  delete: async (path: string) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(response);
  },
};

export const getMonitoringApiUrl = (siteId: string) => {
  return `${sanitizedApiUrlBase}/monitoring?siteId=${siteId}`;
};


// --- WebSocket Singleton ---

let socket: WebSocket | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;
let onNotificationCallback: ((notification: Notification) => void) | null = null;

const disconnect = () => {
    if (pingInterval) clearInterval(pingInterval);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (socket) {
        socket.onclose = null; // Prevent reconnect logic from firing on manual close
        socket.close();
    }
    socket = null;
    pingInterval = null;
    reconnectTimeout = null;
    isConnecting = false;
};

const connect = async () => {
    if ((socket && socket.readyState === WebSocket.OPEN) || isConnecting) {
        console.log("WebSocket connection attempt skipped: already connected or connecting.");
        return;
    }

    isConnecting = true;
    console.log('Attempting to connect WebSocket...');

    try {
        const session = await getCurrentUser();
        if (!session || !session.isValid()) {
            console.log("No valid session, WebSocket connection deferred.");
            isConnecting = false;
            if (!reconnectTimeout) {
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    connect();
                }, 5000);
            }
            return;
        }

        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }

        const token = session.getIdToken().getJwtToken();
        const authenticatedWsUrl = `${config.websocket.invokeUrl}?token=${token}`;

        socket = new WebSocket(authenticatedWsUrl);

        socket.onopen = () => {
            console.log('WebSocket connected successfully.');
            isConnecting = false;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            pingInterval = setInterval(() => {
                if (socket?.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ action: 'ping' }));
                }
            }, 30000);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'pong') {
                    return;
                }
                if (data.type === 'NEW_NOTIFICATION' && onNotificationCallback) {
                    console.log('Received new notification via WebSocket:', data.notification);
                    onNotificationCallback(data.notification as Notification);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        socket.onclose = (event) => {
            console.warn(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}. Reconnecting...`);
            if (pingInterval) clearInterval(pingInterval);
            pingInterval = null;
            socket = null;
            isConnecting = false;
            if (!reconnectTimeout) {
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    connect();
                }, 5000);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            isConnecting = false;
            socket?.close();
        };

    } catch (error) {
        console.error('Could not establish WebSocket connection due to authentication error:', error);
        isConnecting = false;
        if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                connect();
            }, 5000);
        }
    }
};

export const connectWebSocket = (onNotification: (notification: Notification) => void) => {
    onNotificationCallback = onNotification;
    connect();

    return () => {
        console.log("Cleaning up WebSocket connection.");
        disconnect();
        onNotificationCallback = null;
    };
};
