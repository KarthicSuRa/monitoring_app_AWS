/**
 * dynamo-client.js
 * Shared DynamoDB DocumentClient singleton + helpers used by all Lambdas.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const rawClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const client = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// ─── Table Name Constants ─────────────────────────────────────────────────
const TABLES = {
  USERS: process.env.TABLE_USERS || 'mcm-users',
  TEAMS: process.env.TABLE_TEAMS || 'mcm-teams',
  TEAM_MEMBERS: process.env.TABLE_TEAM_MEMBERS || 'mcm-team-members',
  MONITORED_SITES: process.env.TABLE_MONITORED_SITES || 'mcm-monitored-sites',
  PING_LOGS: process.env.TABLE_PING_LOGS || 'mcm-ping-logs',
  SYNTHETIC_TESTS: process.env.TABLE_SYNTHETIC_TESTS || 'mcm-synthetic-tests',
  SYNTHETIC_STEPS: process.env.TABLE_SYNTHETIC_STEPS || 'mcm-synthetic-steps',
  ALERT_RULES: process.env.TABLE_ALERT_RULES || 'mcm-alert-rules',
  MAINTENANCE_WINDOWS: process.env.TABLE_MAINTENANCE_WINDOWS || 'mcm-maintenance-windows',
  SSL_CERTIFICATES: process.env.TABLE_SSL_CERTIFICATES || 'mcm-ssl-certificates',
  HEARTBEAT_CHECKS: process.env.TABLE_HEARTBEAT_CHECKS || 'mcm-heartbeat-checks',
  NOTIFICATIONS: process.env.TABLE_NOTIFICATIONS || 'mcm-notifications',
  COMMENTS: process.env.TABLE_COMMENTS || 'mcm-comments',
  TOPICS: process.env.TABLE_TOPICS || 'mcm-topics',
  TOPIC_SUBSCRIPTIONS: process.env.TABLE_TOPIC_SUBSCRIPTIONS || 'mcm-topic-subscriptions',
  WEBHOOK_SOURCES: process.env.TABLE_WEBHOOK_SOURCES || 'mcm-webhook-sources',
  WEBHOOK_EVENTS: process.env.TABLE_WEBHOOK_EVENTS || 'mcm-webhook-events',
  SFCC_ORDERS: process.env.TABLE_SFCC_ORDERS || 'mcm-sfcc-orders',
  ORDERS: process.env.TABLE_ORDERS || 'mcm-orders',
  PUSH_SUBSCRIPTIONS: process.env.TABLE_PUSH_SUBSCRIPTIONS || 'mcm-push-subscriptions',
  CALENDAR_EVENTS: process.env.TABLE_CALENDAR_EVENTS || 'mcm-calendar-events',
  AUDIT_LOGS: process.env.TABLE_AUDIT_LOGS || 'mcm-audit-logs',
  WEBSOCKET_CONNECTIONS: process.env.TABLE_WEBSOCKET_CONNECTIONS || 'mcm-websocket-connections',
  USER_PREFS: process.env.TABLE_USER_PREFS || 'mcm-user-prefs',
  EMAILS: process.env.TABLE_EMAILS || 'mcm-emails',
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function newId() {
  return uuidv4();
}

/** TTL timestamp: X days from now (in seconds, as required by DynamoDB TTL) */
function ttlDays(days) {
  return Math.floor(Date.now() / 1000) + days * 86400;
}

async function getItem(tableName, key) {
  const res = await client.send(new GetCommand({ TableName: tableName, Key: key }));
  return res.Item || null;
}

async function putItem(tableName, item) {
  await client.send(new PutCommand({ TableName: tableName, Item: item }));
  return item;
}

async function updateItem(tableName, key, updates) {
  const entries = Object.entries(updates).filter(([k]) => k !== 'id');
  if (entries.length === 0) return null;

  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  const setParts = [];

  entries.forEach(([k, v]) => {
    const kk = `#${k}`;
    const vk = `:${k}`;
    ExpressionAttributeNames[kk] = k;
    ExpressionAttributeValues[vk] = v;
    setParts.push(`${kk} = ${vk}`);
  });

  const res = await client.send(new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: `SET ${setParts.join(', ')}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
}

async function deleteItem(tableName, key) {
  await client.send(new DeleteCommand({ TableName: tableName, Key: key }));
}

async function queryItems(tableName, params) {
  const results = [];
  let lastKey = undefined;
  do {
    const res = await client.send(new QueryCommand({
      TableName: tableName,
      ...params,
      ExclusiveStartKey: lastKey,
    }));
    results.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey && (!params.Limit || results.length < params.Limit));
  return results;
}

async function scanItems(tableName, params = {}) {
  const results = [];
  let lastKey = undefined;
  do {
    const res = await client.send(new ScanCommand({
      TableName: tableName,
      ...params,
      ExclusiveStartKey: lastKey,
    }));
    results.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return results;
}

async function batchWrite(tableName, items) {
  const CHUNK = 25;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    await client.send(new BatchWriteCommand({
      RequestItems: {
        [tableName]: chunk.map(item => ({ PutRequest: { Item: item } })),
      },
    }));
  }
}

module.exports = {
  client,
  TABLES,
  now,
  newId,
  ttlDays,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  scanItems,
  batchWrite,
};
