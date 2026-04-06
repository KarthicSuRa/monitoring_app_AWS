import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DynamoTables {
  users: dynamodb.Table;
  teams: dynamodb.Table;
  teamMembers: dynamodb.Table;
  monitoredSites: dynamodb.Table;
  pingLogs: dynamodb.Table;
  syntheticTests: dynamodb.Table;
  syntheticSteps: dynamodb.Table;
  alertRules: dynamodb.Table;
  maintenanceWindows: dynamodb.Table;
  sslCertificates: dynamodb.Table;
  heartbeatChecks: dynamodb.Table;
  notifications: dynamodb.Table;
  comments: dynamodb.Table;
  topics: dynamodb.Table;
  topicSubscriptions: dynamodb.Table;
  webhookSources: dynamodb.Table;
  webhookEvents: dynamodb.Table;
  sfccOrders: dynamodb.Table;
  orders: dynamodb.Table;
  pushSubscriptions: dynamodb.Table;
  calendarEvents: dynamodb.Table;
  auditLogs: dynamodb.Table;
  websocketConnections: dynamodb.Table;
  userPrefs: dynamodb.Table;
  emails: dynamodb.Table;
}

export function createDynamoTables(scope: Construct): DynamoTables {
  const removal = cdk.RemovalPolicy.DESTROY;
  const billing = dynamodb.BillingMode.PAY_PER_REQUEST;

  // ─── Users ───────────────────────────────────────────────────────────────
  const users = new dynamodb.Table(scope, 'UsersTable', {
    tableName: 'mcm-users',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  users.addGlobalSecondaryIndex({
    indexName: 'email-index',
    partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Teams ────────────────────────────────────────────────────────────────
  const teams = new dynamodb.Table(scope, 'TeamsTable', {
    tableName: 'mcm-teams',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── Team Members ─────────────────────────────────────────────────────────
  const teamMembers = new dynamodb.Table(scope, 'TeamMembersTable', {
    tableName: 'mcm-team-members',
    partitionKey: { name: 'team_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  teamMembers.addGlobalSecondaryIndex({
    indexName: 'user-id-index',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Monitored Sites ──────────────────────────────────────────────────────
  const monitoredSites = new dynamodb.Table(scope, 'MonitoredSitesTable', {
    tableName: 'mcm-monitored-sites',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  monitoredSites.addGlobalSecondaryIndex({
    indexName: 'url-index',
    partitionKey: { name: 'url', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.KEYS_ONLY,
  });

  // ─── Ping Logs ────────────────────────────────────────────────────────────
  const pingLogs = new dynamodb.Table(scope, 'PingLogsTable', {
    tableName: 'mcm-ping-logs',
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'checked_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl', // auto-expire old ping logs after 90 days
  });

  // ─── Synthetic Tests ──────────────────────────────────────────────────────
  const syntheticTests = new dynamodb.Table(scope, 'SyntheticTestsTable', {
    tableName: 'mcm-synthetic-tests',
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl',
  });

  // ─── Synthetic Test Steps ─────────────────────────────────────────────────
  const syntheticSteps = new dynamodb.Table(scope, 'SyntheticStepsTable', {
    tableName: 'mcm-synthetic-steps',
    partitionKey: { name: 'test_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── Alert Rules ──────────────────────────────────────────────────────────
  const alertRules = new dynamodb.Table(scope, 'AlertRulesTable', {
    tableName: 'mcm-alert-rules',
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── Maintenance Windows ──────────────────────────────────────────────────
  const maintenanceWindows = new dynamodb.Table(scope, 'MaintenanceWindowsTable', {
    tableName: 'mcm-maintenance-windows',
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── SSL Certificates ─────────────────────────────────────────────────────
  const sslCertificates = new dynamodb.Table(scope, 'SslCertificatesTable', {
    tableName: 'mcm-ssl-certificates',
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── Heartbeat Checks ─────────────────────────────────────────────────────
  const heartbeatChecks = new dynamodb.Table(scope, 'HeartbeatChecksTable', {
    tableName: 'mcm-heartbeat-checks',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  heartbeatChecks.addGlobalSecondaryIndex({
    indexName: 'name-index',
    partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Topics ───────────────────────────────────────────────────────────────
  const topics = new dynamodb.Table(scope, 'TopicsTable', {
    tableName: 'mcm-topics',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  topics.addGlobalSecondaryIndex({
    indexName: 'name-index',
    partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  const notifications = new dynamodb.Table(scope, 'NotificationsTable', {
    tableName: 'mcm-notifications',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  // GSI for listing all notifications sorted by creation time
  notifications.addGlobalSecondaryIndex({
    indexName: 'status-created-index',
    partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });
  // GSI for topic-filtered notification listing
  notifications.addGlobalSecondaryIndex({
    indexName: 'topic-created-index',
    partitionKey: { name: 'topic_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Comments ─────────────────────────────────────────────────────────────
  const comments = new dynamodb.Table(scope, 'CommentsTable', {
    tableName: 'mcm-comments',
    partitionKey: { name: 'notification_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── Topic Subscriptions ──────────────────────────────────────────────────
  const topicSubscriptions = new dynamodb.Table(scope, 'TopicSubscriptionsTable', {
    tableName: 'mcm-topic-subscriptions',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'topic_id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  topicSubscriptions.addGlobalSecondaryIndex({
    indexName: 'topic-id-index',
    partitionKey: { name: 'topic_id', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Webhook Sources ──────────────────────────────────────────────────────
  const webhookSources = new dynamodb.Table(scope, 'WebhookSourcesTable', {
    tableName: 'mcm-webhook-sources',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── Webhook Events ───────────────────────────────────────────────────────
  const webhookEvents = new dynamodb.Table(scope, 'WebhookEventsTable', {
    tableName: 'mcm-webhook-events',
    partitionKey: { name: 'source_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl',
  });

  // ─── SFCC Orders ──────────────────────────────────────────────────────────
  const sfccOrders = new dynamodb.Table(scope, 'SfccOrdersTable', {
    tableName: 'mcm-sfcc-orders',
    partitionKey: { name: 'order_no', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'realm_key', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  sfccOrders.addGlobalSecondaryIndex({
    indexName: 'realm-modified-index',
    partitionKey: { name: 'realm_key', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'last_modified', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Orders (normalized, with fulfillment tracking) ───────────────────────
  const orders = new dynamodb.Table(scope, 'OrdersTable', {
    tableName: 'mcm-orders',
    partitionKey: { name: 'order_no', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'source_system', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  orders.addGlobalSecondaryIndex({
    indexName: 'site-modified-index',
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'last_modified', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });
  orders.addGlobalSecondaryIndex({
    indexName: 'fulfillment-status-index',
    partitionKey: { name: 'fulfillment_status', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'last_modified', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });
  orders.addGlobalSecondaryIndex({
    indexName: 'shipment-status-index',
    partitionKey: { name: 'shipment_status', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'last_modified', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Push Subscriptions ───────────────────────────────────────────────────
  const pushSubscriptions = new dynamodb.Table(scope, 'PushSubscriptionsTable', {
    tableName: 'mcm-push-subscriptions',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'token', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  pushSubscriptions.addGlobalSecondaryIndex({
    indexName: 'token-index',
    partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Calendar Events ──────────────────────────────────────────────────────
  const calendarEvents = new dynamodb.Table(scope, 'CalendarEventsTable', {
    tableName: 'mcm-calendar-events',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  calendarEvents.addGlobalSecondaryIndex({
    indexName: 'start-time-index',
    partitionKey: { name: 'year_month', type: dynamodb.AttributeType.STRING }, // e.g. "2026-04"
    sortKey: { name: 'start_time', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  const auditLogs = new dynamodb.Table(scope, 'AuditLogsTable', {
    tableName: 'mcm-audit-logs',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl', // expire old audit logs
  });
  auditLogs.addGlobalSecondaryIndex({
    indexName: 'user-created-index',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });
  auditLogs.addGlobalSecondaryIndex({
    indexName: 'all-created-index',
    partitionKey: { name: 'log_type', type: dynamodb.AttributeType.STRING }, // 'AUDIT' constant
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── WebSocket Connections ───────────────────────────────────────────────
  const websocketConnections = new dynamodb.Table(scope, 'WebsocketConnectionsTable', {
    tableName: 'mcm-websocket-connections',
    partitionKey: { name: 'connection_id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl', // stale connections auto-expire
  });
  websocketConnections.addGlobalSecondaryIndex({
    indexName: 'user-id-index',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // ─── User Preferences ────────────────────────────────────────────────────
  const userPrefs = new dynamodb.Table(scope, 'UserPrefsTable', {
    tableName: 'mcm-user-prefs',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  // ─── Emails ───────────────────────────────────────────────────────────────
  const emails = new dynamodb.Table(scope, 'EmailsTable', {
    tableName: 'mcm-emails',
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  emails.addGlobalSecondaryIndex({
    indexName: 'status-created-index',
    partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  return {
    users, teams, teamMembers, monitoredSites, pingLogs, syntheticTests,
    syntheticSteps, alertRules, maintenanceWindows, sslCertificates,
    heartbeatChecks, notifications, comments, topics, topicSubscriptions,
    webhookSources, webhookEvents, sfccOrders, orders, pushSubscriptions,
    calendarEvents, auditLogs, websocketConnections, userPrefs, emails,
  };
}
