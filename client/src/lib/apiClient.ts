import { CognitoUserSession } from 'amazon-cognito-identity-js';
import { getCurrentUser } from './cognitoClient';

const apiUrlBase = import.meta.env.VITE_API_URL;

if (!apiUrlBase) {
  throw new Error(
    'API URL is required. Make sure to set VITE_API_URL in your .env file or hosting provider.'
  );
}

const getHeaders = async () => {
  const session: CognitoUserSession | null = await getCurrentUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session) {
    const token = session.getIdToken().getJwtToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

const sanitizedApiUrlBase = apiUrlBase.endsWith('/') ? apiUrlBase.slice(0, -1) : apiUrlBase;

export const apiClient = {
  get: async (path: string) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  post: async (path: string, body: any) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  put: async (path: string, body: any) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  delete: async (path: string) => {
    const headers = await getHeaders();
    const response = await fetch(`${sanitizedApiUrlBase}${path}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};

export const getMonitoringApiUrl = (siteId: string) => {
  return `${sanitizedApiUrlBase}/monitoring?siteId=${siteId}`;
};
