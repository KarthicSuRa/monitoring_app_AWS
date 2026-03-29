
      import { apiClient } from './apiClient';
      import { MonitoredSite, Topic, Notification, CalendarEvent, AuditLog, WebhookSource, Email, User, Team } from '../types';

      // --- API Methods ---

      // Monitoring
      export const getSites = (): Promise<MonitoredSite[]> => apiClient.get('/sites');
      export const addSite = (site: Omit<MonitoredSite, 'id' | 'created_at' | 'updated_at'>): Promise<MonitoredSite> => apiClient.post('/sites', site);
      export const deleteSite = (siteId: string): Promise<void> => apiClient.delete(`/sites/${siteId}`);
      export const triggerMonitoring = (): Promise<void> => apiClient.post('/monitoring/trigger', {});

      // Topics
      export const getTopics = (): Promise<Topic[]> => apiClient.get('/topics');
      export const addTopic = (topic: { name: string, description: string }): Promise<Topic> => apiClient.post('/topics', topic);
      export const deleteTopic = (topicId: string): Promise<void> => apiClient.delete(`/topics/${topicId}`);
      export const toggleTopicSubscription = (topicId: string): Promise<void> => apiClient.post(`/topics/${topicId}/subscription`, {});
      export const updateTopicTeam = (topicId: string, teamId: string | null): Promise<void> => apiClient.put(`/teams/${teamId}/topics`, { topic_id: topicId, assign: !!teamId });


      // Notifications
      export const getNotifications = (): Promise<Notification[]> => apiClient.get('/notifications');
      export const getNotification = (id: string): Promise<Notification> => apiClient.get(`/notifications/${id}`);
      export const updateNotification = (id: string, update: Partial<Notification>): Promise<Notification> => apiClient.put(`/notifications/${id}`, update);
      export const addComment = (notificationId: string, comment: { text: string }): Promise<Comment> => apiClient.post(`/notifications/${notificationId}/comments`, comment);
      export const sendTestAlert = (): Promise<void> => apiClient.post('/notifications/test', {});

      // User & Team Management
      export const getUsers = (): Promise<User[]> => apiClient.get('/users');
      export const updateUser = (userId: string, updates: Partial<User>): Promise<User> => apiClient.put(`/users/${userId}`, updates);
      export const getTeams = (): Promise<Team[]> => apiClient.get('/teams');
      export const createTeam = (teamName: string): Promise<Team> => apiClient.post('/teams', { name: teamName });
      export const addTeamMember = (teamId: string, userId: string, role: string): Promise<void> => apiClient.put(`/teams/${teamId}/members`, { user_id: userId, team_role: role });
      export const removeTeamMember = (teamId: string, userId: string): Promise<void> => apiClient.delete(`/teams/${teamId}/members/${userId}`);

      // Calendar
      export const getCalendarEvents = (): Promise<CalendarEvent[]> => apiClient.get('/calendar');

      // Audit Logs
      export const getAuditLogs = (): Promise<AuditLog[]> => apiClient.get('/audit-logs');

      // Webhooks
      export const getWebhookSources = (): Promise<WebhookSource[]> => apiClient.get('/webhooks');
      export const addWebhookSource = (source: Omit<WebhookSource, 'id' | 'created_at'>): Promise<WebhookSource> => apiClient.post('/webhooks', source);
      export const deleteWebhookSource = (sourceId: string): Promise<void> => apiClient.delete(`/webhooks/${sourceId}`);

      // Emails
      export const getEmails = (): Promise<Email[]> => apiClient.get('/emails');
