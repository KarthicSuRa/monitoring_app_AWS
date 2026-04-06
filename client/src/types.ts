import { CognitoUserSession } from 'amazon-cognito-identity-js';

// A simpler, more generic Session type for our app
export type Session = CognitoUserSession | null;

export interface User {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  app_role?: string;
  notification_preferences?: {
    [key: string]: boolean;
  };
  team?: {
    id: string;
    name: string;
  } | null;
}

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export type Severity = 'low' | 'medium' | 'high';

export type NotificationStatus = 'new' | 'acknowledged' | 'resolved';

export interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  // User's full name can be added here if needed from the backend
  user_full_name?: string; 
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: Severity;
  status: NotificationStatus;
  timestamp: string;
  site: string | null;
  comments: Comment[];
  topic_id: string | null;
  created_at: string;
  updated_at: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

// This represents the JSON payload for updating a notification
export interface NotificationUpdatePayload {
  status?: NotificationStatus;
  severity?: Severity;
  // Add any other fields that can be updated
}

export interface Topic {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  subscribed?: boolean;
  team_id: string | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  details: string;
  notification_id: string | null;
}

export interface SystemStatusData {
  status: 'operational' | 'degraded_performance' | 'major_outage' | 'unknown';
  message: string;
  last_updated: string;
  service: 'Ready' | 'Error';
  database: 'Connected' | 'Disconnected';
  push: 'Supported' | 'Unsupported' | 'SNS';
  subscription: 'Active' | 'Inactive';
}

export interface OneSignalPlayer {
  id: string;
  user_id: string;
  player_id: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id?: string;
  start: string;
  title: string;
  description: string;
  category: string;
  allDay: boolean;
  color?: string;
  team?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface PingLog {
  id: number;
  site_id: string;
  is_up: boolean;
  response_time_ms: number;
  status_code: number;
  status_text: string;
  checked_at: string;
}

export interface Incident {
  reason: string;
  started_at: string;
  duration_human: string;
  is_resolved: boolean;
}

export interface MonitoredSite {
  id: string;
  name: string;
  url: string;
  country: string;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
  status?: 'online' | 'offline' | 'unknown';
  ping_logs?: PingLog[];
  latest_ping?: PingLog;
  last_checked?: string;
  incidents?: Incident[];
}

export interface WebhookSource {
  id: string;
  user_id?: string;
  name: string;
  description?: string | null;
  source_type: string;
  created_at: string;
  topic_id: string | null;
}

export interface WebhookEvent {
  id: string;
  source_id: string;
  payload: any; 
  created_at: string;
}

export interface TeamMember {
  user_id: string;
  team_role: string;
  // Joined from the 'users' table on the client-side
  full_name?: string;
  email?: string;
}

export interface Team {
  id: string;
  name: string;
  created_by: string;
  team_members: TeamMember[];
}


export interface Event {
  id: string;
  label: string;
  timestamp: string;
  status: 'completed' | 'active' | 'pending';
  details: {
    title: string;
    subtitle: string;
    data: { [key: string]: string | number };
    logs: {
      type: 'email' | 'api' | 'info';
      message: string;
      timestamp: string;
    }[];
  };
}

export interface Email {
  id: string;
  subject: string;
  sender: string;
  message: string;
  received_at: string;
}
