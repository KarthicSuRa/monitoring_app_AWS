import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

const resourceName = (project: string, environment: string, resourceType: string, name: string) =>
  `${project}-${environment}-${resourceType}-${name}`;

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

export function createDynamoTables(scope: Construct, project: string, environment: string): DynamoTables {
  const removal = cdk.RemovalPolicy.DESTROY;
  const billing = dynamodb.BillingMode.PAY_PER_REQUEST;
  const tableType = 'dynamodb-table';

  const users = new dynamodb.Table(scope, 'UsersTable', {
    tableName: resourceName(project, environment, tableType, 'users'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  users.addGlobalSecondaryIndex({
    indexName: 'email-index',
    partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const teams = new dynamodb.Table(scope, 'TeamsTable', {
    tableName: resourceName(project, environment, tableType, 'teams'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const teamMembers = new dynamodb.Table(scope, 'TeamMembersTable', {
    tableName: resourceName(project, environment, tableType, 'team-members'),
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

  const monitoredSites = new dynamodb.Table(scope, 'MonitoredSitesTable', {
    tableName: resourceName(project, environment, tableType, 'monitored-sites'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  monitoredSites.addGlobalSecondaryIndex({
    indexName: 'url-index',
    partitionKey: { name: 'url', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.KEYS_ONLY,
  });

  const pingLogs = new dynamodb.Table(scope, 'PingLogsTable', {
    tableName: resourceName(project, environment, tableType, 'ping-logs'),
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'checked_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl',
  });

  const syntheticTests = new dynamodb.Table(scope, 'SyntheticTestsTable', {
    tableName: resourceName(project, environment, tableType, 'synthetic-tests'),
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl',
  });

  const syntheticSteps = new dynamodb.Table(scope, 'SyntheticStepsTable', {
    tableName: resourceName(project, environment, tableType, 'synthetic-steps'),
    partitionKey: { name: 'test_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const alertRules = new dynamodb.Table(scope, 'AlertRulesTable', {
    tableName: resourceName(project, environment, tableType, 'alert-rules'),
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const maintenanceWindows = new dynamodb.Table(scope, 'MaintenanceWindowsTable', {
    tableName: resourceName(project, environment, tableType, 'maintenance-windows'),
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const sslCertificates = new dynamodb.Table(scope, 'SslCertificatesTable', {
    tableName: resourceName(project, environment, tableType, 'ssl-certificates'),
    partitionKey: { name: 'site_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const heartbeatChecks = new dynamodb.Table(scope, 'HeartbeatChecksTable', {
    tableName: resourceName(project, environment, tableType, 'heartbeat-checks'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  heartbeatChecks.addGlobalSecondaryIndex({
    indexName: 'name-index',
    partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const topics = new dynamodb.Table(scope, 'TopicsTable', {
    tableName: resourceName(project, environment, tableType, 'topics'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  topics.addGlobalSecondaryIndex({
    indexName: 'name-index',
    partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const notifications = new dynamodb.Table(scope, 'NotificationsTable', {
    tableName: resourceName(project, environment, tableType, 'notifications'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  notifications.addGlobalSecondaryIndex({
    indexName: 'status-created-index',
    partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });
  notifications.addGlobalSecondaryIndex({
    indexName: 'topic-created-index',
    partitionKey: { name: 'topic_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const comments = new dynamodb.Table(scope, 'CommentsTable', {
    tableName: resourceName(project, environment, tableType, 'comments'),
    partitionKey: { name: 'notification_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const topicSubscriptions = new dynamodb.Table(scope, 'TopicSubscriptionsTable', {
    tableName: resourceName(project, environment, tableType, 'topic-subscriptions'),
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

  const webhookSources = new dynamodb.Table(scope, 'WebhookSourcesTable', {
    tableName: resourceName(project, environment, tableType, 'webhook-sources'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const webhookEvents = new dynamodb.Table(scope, 'WebhookEventsTable', {
    tableName: resourceName(project, environment, tableType, 'webhook-events'),
    partitionKey: { name: 'source_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl',
  });

  const sfccOrders = new dynamodb.Table(scope, 'SfccOrdersTable', {
    tableName: resourceName(project, environment, tableType, 'sfcc-orders'),
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

  const orders = new dynamodb.Table(scope, 'OrdersTable', {
    tableName: resourceName(project, environment, tableType, 'orders'),
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

  const pushSubscriptions = new dynamodb.Table(scope, 'PushSubscriptionsTable', {
    tableName: resourceName(project, environment, tableType, 'push-subscriptions'),
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

  const calendarEvents = new dynamodb.Table(scope, 'CalendarEventsTable', {
    tableName: resourceName(project, environment, tableType, 'calendar-events'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });
  calendarEvents.addGlobalSecondaryIndex({
    indexName: 'start-time-index',
    partitionKey: { name: 'year_month', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'start_time', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const auditLogs = new dynamodb.Table(scope, 'AuditLogsTable', {
    tableName: resourceName(project, environment, tableType, 'audit-logs'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl',
  });
  auditLogs.addGlobalSecondaryIndex({
    indexName: 'user-created-index',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });
  auditLogs.addGlobalSecondaryIndex({
    indexName: 'all-created-index',
    partitionKey: { name: 'log_type', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const websocketConnections = new dynamodb.Table(scope, 'WebsocketConnectionsTable', {
    tableName: resourceName(project, environment, tableType, 'websocket-connections'),
    partitionKey: { name: 'connection_id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
    timeToLiveAttribute: 'ttl',
  });
  websocketConnections.addGlobalSecondaryIndex({
    indexName: 'user-id-index',
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const userPrefs = new dynamodb.Table(scope, 'UserPrefsTable', {
    tableName: resourceName(project, environment, tableType, 'user-prefs'),
    partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    billingMode: billing,
    removalPolicy: removal,
  });

  const emails = new dynamodb.Table(scope, 'EmailsTable', {
    tableName: resourceName(project, environment, tableType, 'emails'),
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
