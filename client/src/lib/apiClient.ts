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

export const connectWebSocket = (onNotification: (notification: Notification) => void) => {
  const wsUrl = config.websocket.invokeUrl;
  
  let socket: WebSocket | null = null;
  let reconnectInterval: NodeJS.Timeout | null = null;

  const connect = async () => {
    try {
      const session = await getCurrentUser();
      if (!session || !session.isValid()) {
        console.log("No valid session, WebSocket connection deferred.");
        return;
      }
      
      const token = session.getIdToken().getJwtToken();
      const authenticatedWsUrl = `${wsUrl}?token=${token}`;
      
      console.log('Attempting to connect WebSocket...');
      socket = new WebSocket(authenticatedWsUrl);

      socket.onopen = () => {
        console.log('WebSocket connected successfully.');
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_NOTIFICATION') {
            console.log('Received new notification via WebSocket:', data.notification);
            onNotification(data.notification as Notification);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.warn(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}. Reconnecting...`);
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connect, 5000); // Attempt to reconnect every 5 seconds
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        socket?.close(); // This will trigger the onclose event and reconnection logic
      };

    } catch (error) {
        console.error('Could not establish WebSocket connection due to authentication error:', error);
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connect, 5000);
        }
    }
  };

  connect();

  return () => {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
    }
    if (socket) {
      socket.close();
    }
  };
};
