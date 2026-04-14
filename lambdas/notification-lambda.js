/**
 * notification-lambda.js
 * Handles: GET/POST /notifications, PUT /notifications/:id,
 *          POST /notifications/:id/comments, POST /notifications/test
 */
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const {
  TABLES, now, newId,
  getItem, putItem, updateItem, deleteItem,
  queryItems, scanItems,
} = require('./dynamo-client');

const snsClient = new SNSClient({});
let apiGw;
function getApiGw() {
  if (!apiGw) {
    const endpoint = process.env.WEBSOCKET_API_ENDPOINT;
    if (!endpoint) {
      console.warn('WEBSOCKET_API_ENDPOINT not set, cannot send WebSocket messages.');
      return null;
    }
    apiGw = new ApiGatewayManagementApiClient({ endpoint });
  }
  return apiGw;
}

// ─── CORS ─────────────────────────────────────────────────────────────────

const getCorsHeaders = (event) => {
  const origin = (event.headers || {}).origin || (event.headers || {}).Origin || '';
  const cf = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
  const allowed = [cf, 'http://localhost:3000'].filter(Boolean);
  if (origin && allowed.includes(origin.replace(/\/$/, ''))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    };
  }
  return {};
};

const json = (status, body, cors = {}) => ({
  statusCode: status,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {}),
});

// ─── WebSocket Notifier ───────────────────────────────────────────────────

const sendWebSocketNotification = async (notification, userId = null) => {
  const apiGw = getApiGw();
  if (!apiGw) return { error: 'WebSocket API not configured' };

  let userIds = [];
  if (userId) {
    userIds = [userId];
  } else {
    const topicSubscribers = await queryItems(TABLES.TOPIC_SUBSCRIPTIONS, {
      IndexName: 'topic-id-index',
      KeyConditionExpression: 'topic_id = :tid',
      ExpressionAttributeValues: { ':tid': notification.topic_id },
    });
    userIds = topicSubscribers.map(s => s.user_id).filter(Boolean);
  }
  
  if (userIds.length === 0) return { status: 'No recipients' };

  const allConnections = (await Promise.all(
    userIds.map(uid => 
      queryItems(TABLES.WEBSOCKET_CONNECTIONS, { 
        IndexName: 'user-id-index', 
        KeyConditionExpression: 'user_id = :uid',
        ExpressionAttributeValues: { ':uid': uid }
      })
    )
  )).flat();
  
  if (allConnections.length === 0) return { status: 'No active connections' };

  const message = JSON.stringify({ type: 'NEW_NOTIFICATION', notification });

  const postCalls = allConnections.map(async ({ connection_id }) => {
    try {
      await apiGw.send(new PostToConnectionCommand({ ConnectionId: connection_id, Data: message }));
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Stale connection ${connection_id}, deleting.`);
        await deleteItem(TABLES.WEBSOCKET_CONNECTIONS, { connection_id });
      } else {
        console.error(`Failed to post to connection ${connection_id}:`, e.message);
      }
    }
  });

  await Promise.all(postCalls);
  return { sent_to: allConnections.length };
};

// ─── Push Notifier ────────────────────────────────────────────────────────

const sendSnsPushToUser = async (notification, userId) => {
  console.log(`Attempting to send push notification to user: ${userId}`);
  const subs = await queryItems(TABLES.PUSH_SUBSCRIPTIONS, {
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  });

  if (!subs || subs.length === 0) {
    console.log(`No push subscriptions found for user: ${userId}`);
    return { status: 'No subscriptions' };
  }
  console.log(`Found ${subs.length} subscriptions for user: ${userId}`);

  const appUrl = (process.env.CLOUDFRONT_URL || 'http://localhost:3000').replace(/\/$/, '');

  const fcmMessage = {
    data: {
      title: notification.title,
      message: notification.message || '',
      icon: `${appUrl}/icons/icon-512x512.png`,
      badge: `${appUrl}/icons/icon-192x192.png`,
      tag: notification.id,
      notificationId: notification.id,
      severity: notification.severity || 'medium',
      type: notification.type || 'general',
      date: notification.created_at,
      timestamp: notification.created_at,
      click_action: appUrl,
    },
    android: {
      priority: 'high',
      notification: {
        channel_id: 'mcm_alerts',
        notification_priority: 'PRIORITY_HIGH',
        sound: 'default',
        default_sound: true,
        default_vibrate_timings: true,
      },
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
      notification: {
        title: notification.title,
        body: notification.message || '',
        icon: `${appUrl}/icons/icon-512x512.png`,
        badge: `${appUrl}/icons/icon-192x192.png`,
        tag: notification.id,
        renotify: true,
        requireInteraction: true,
      },
      fcm_options: {
        link: appUrl,
      },
    },
  };

  const snsPayload = {
    default: `MCM Alert: ${notification.title}`,
    GCM: JSON.stringify(fcmMessage),
  };

  const message = JSON.stringify(snsPayload);
  console.log(`Sending SNS message for user ${userId}:`, message);

  const publishPromises = subs.map(sub => {
    console.log(`Publishing to endpoint: ${sub.endpoint_arn}`);
    return snsClient.send(new PublishCommand({
      TargetArn: sub.endpoint_arn,
      Message: message,
      MessageStructure: 'json',
    })).catch(err => {
      console.error(`SNS Publish failed for ${sub.endpoint_arn}:`, err.message);
      return { error: err };
    });
  });
  
  const outcomes = await Promise.allSettled(publishPromises);

  const results = outcomes.map((outcome, index) => {
    const sub = subs[index];
    if (outcome.status === 'fulfilled' && !outcome.value.error) {
      console.log(`Successfully sent to ${sub.endpoint_arn}:`, outcome.value.MessageId);
      return { endpoint: sub.endpoint_arn, messageId: outcome.value.MessageId, status: 'success' };
    } else {
      const errorMessage = outcome.status === 'rejected' ? outcome.reason.message : outcome.value.error.message;
      console.error(`Failed to send to ${sub.endpoint_arn}:`, errorMessage);
      return { endpoint: sub.endpoint_arn, error: errorMessage, status: 'failed' };
    }
  });

  return results;
};


// ─── NOTIFICATION HANDLERS ────────────────────────────────────────────────

async function handleNotifications(method, path, body, user, cors) {
  const pathParts = path.split('/').filter(p => p && p !== 'prod');
  const second = pathParts[1];
  const third = pathParts[2];

  const isTest = second === 'test';
  const notificationId = second && !isTest ? second : null;
  const isComments = third === 'comments';

  const addDateProps = (item) => (item ? { ...item, date: item.created_at, timestamp: item.created_at } : item);

  if (method === 'POST' && !second) {
    const { topic_name, topic_id, title, message, severity, type, metadata } = body;
    if (!title || !severity) {
      console.error('Validation failed: title and severity are required');
      return json(400, { error: 'title and severity are required' }, cors);
    }

    let finalTopicId = topic_id || null;
    if (topic_name && !finalTopicId) {
      const topicItems = await queryItems(TABLES.TOPICS, {
        IndexName: 'name-index', KeyConditionExpression: '#n = :name',
        ExpressionAttributeNames: { '#n': 'name' }, ExpressionAttributeValues: { ':name': topic_name },
        Limit: 1,
      });
      if (topicItems.length > 0) {
        finalTopicId = topicItems[0].id;
      } else {
        console.log(`Creating new topic: ${topic_name}`)
        finalTopicId = newId();
        await putItem(TABLES.TOPICS, { id: finalTopicId, name: topic_name, created_at: now(), updated_at: now() });
      }
    }

    if (!finalTopicId) {
      const generalTopicName = 'General';
      console.log('No topic provided, assigning to General');
      const topicItems = await queryItems(TABLES.TOPICS, {
        IndexName: 'name-index', KeyConditionExpression: '#n = :name',
        ExpressionAttributeNames: { '#n': 'name' }, ExpressionAttributeValues: { ':name': generalTopicName },
        Limit: 1,
      });
      if (topicItems.length > 0) {
        finalTopicId = topicItems[0].id;
      } else {
        finalTopicId = newId();
        await putItem(TABLES.TOPICS, { id: finalTopicId, name: generalTopicName, created_at: now(), updated_at: now() });
      }
    }

    const ts = now();
    const item = {
      id: newId(), topic_id: finalTopicId, title, message: message || '', severity: severity || 'medium',
      status: 'new', type: type || 'webhook', metadata: metadata || null, created_at: ts, updated_at: ts,
    };
    await putItem(TABLES.NOTIFICATIONS, item);
    console.log('Saved new notification:', item.id);

    const topicSubscribers = await queryItems(TABLES.TOPIC_SUBSCRIPTIONS, {
      IndexName: 'topic-id-index', KeyConditionExpression: 'topic_id = :tid', ExpressionAttributeValues: { ':tid': item.topic_id },
    });
    const userIds = [...new Set(topicSubscribers.map(sub => sub.user_id).filter(Boolean))];
    console.log(`Found ${userIds.length} unique users for topic ${item.topic_id}`);

    const pushTask = Promise.all(userIds.map(uid => sendSnsPushToUser(item, uid)));
    const wsTask = sendWebSocketNotification(addDateProps(item));
    
    const [pushResults, wsResult] = await Promise.all([pushTask, wsTask]);
    const flattenedPushResults = pushResults.flat();

    console.log('Push notification results:', flattenedPushResults);
    console.log('WebSocket notification result:', wsResult);

    return json(201, { ...addDateProps(item), push_notification: { sent_to_users: userIds, results: flattenedPushResults }, websocket_notification: wsResult }, cors);
  }

  if (!user) return json(401, { error: 'Unauthorized' }, cors);

  if (method === 'POST' && isTest) {
    const ts = now();
    const item = {
      id: newId(), topic_id: 'test-notifications', title: 'Test Alert: Everything is Awesome!',
      message: 'This is a test notification to confirm your alert setup is working. No action required.',
      severity: 'low', status: 'new', type: 'manual', metadata: { sent_by: user.id }, created_at: ts, updated_at: ts,
    };
    
    await putItem(TABLES.NOTIFICATIONS, item);
    console.log('Sent test notification for user:', user.id);
    
    const wsResult = await sendWebSocketNotification(addDateProps(item), user.id);
    const pushResult = await sendSnsPushToUser(item, user.id);

    return json(201, { ...addDateProps(item), websocket_notification: wsResult, push_notification: { sent_to_users: [user.id], results: pushResult } }, cors);
  }

  if (notificationId && isComments && method === 'POST') {
    const { text } = body;
    if (!text || !text.trim()) return json(400, { error: 'Comment text required' }, cors);
    const ts = now();
    const item = { notification_id: notificationId, created_at: ts, id: newId(), user_id: user.id, text: text.trim() };
    await putItem(TABLES.COMMENTS, item);
    console.log(`New comment added to notification ${notificationId} by user ${user.id}`);
    return json(201, item, cors);
  }

  if (notificationId && method === 'GET') {
    const notif = await getItem(TABLES.NOTIFICATIONS, { id: notificationId });
    if (!notif) return json(404, { error: 'Notification not found' }, cors);

    const comments = await queryItems(TABLES.COMMENTS, { KeyConditionExpression: 'notification_id = :nid', ExpressionAttributeValues: { ':nid': notificationId }, ScanIndexForward: true });
    notif.comments = comments;
    return json(200, addDateProps(notif), cors);
  }

  if (notificationId && method === 'PUT') {
    const { status } = body;
    const valid = ['new', 'acknowledged', 'resolved'];
    if (!status || !valid.includes(status))
      return json(400, { error: `status must be one of: ${valid.join(', ')}` }, cors);

    const updated = await updateItem(TABLES.NOTIFICATIONS, { id: notificationId }, { status, updated_at: now() });
    console.log(`Notification ${notificationId} status updated to ${status}`);
    return json(200, addDateProps(updated), cors);
  }

  if (method === 'GET') {
    const statuses = ['new', 'acknowledged', 'resolved'];
    const allItems = (await Promise.all(statuses.map(s =>
      queryItems(TABLES.NOTIFICATIONS, {
        IndexName: 'status-created-index', KeyConditionExpression: '#s = :s',
        ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': s },
        ScanIndexForward: false, Limit: 100,
      })
    ))).flat();

    allItems.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const top200 = allItems.slice(0, 200);

    const results = await Promise.all(top200.map(async (n) => {
      const comments = await queryItems(TABLES.COMMENTS, {
        KeyConditionExpression: 'notification_id = :nid',
        ExpressionAttributeValues: { ':nid': n.id },
        ScanIndexForward: true,
      });
      // DEFINITIVE FIX: Add both date and timestamp for full frontend compatibility.
      return { ...n, date: n.created_at, timestamp: n.created_at, comments: comments || [] };
    }));

    return json(200, results, cors);
  }

  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const cors = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: cors, body: '' };

  const path = event.path.replace(/^\/prod/, '');
  const method = event.httpMethod;

  const isPublic = method === 'POST' && path === '/notifications';

  let user = null;
  if (!isPublic) {
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) return json(401, { error: 'Unauthorized' }, cors);
    user = { id: claims.sub, email: claims.email, app_role: claims['custom:app_role'] || 'member' };
    const existing = await getItem(TABLES.USERS, { id: user.id });
    if (!existing) {
      console.log(`New user detected, creating record for: ${user.id}`);
      await putItem(TABLES.USERS, { id: user.id, email: user.email, app_role: user.app_role, created_at: now(), updated_at: now() });
    }
  }

  const body = event.body ? JSON.parse(event.body) : {};

  try {
    return await handleNotifications(method, path, body, user, cors);
  } catch (err) {
    console.error('FATAL notification-lambda:', err.message, err.stack);
    return json(500, { error: 'Internal Server Error', details: err.message }, cors);
  }
};