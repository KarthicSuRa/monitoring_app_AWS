/**
 * notification-lambda.js  (DynamoDB rewrite + FCM v1 SNS fix)
 * Handles: GET/POST /notifications, PUT /notifications/:id,
 *          POST /notifications/:id/comments, POST /notifications/test
 *
 * FIXED: SNS FCM v1 payload now uses the correct structure that AWS SNS
 * expects when Platform = GCM (FCM HTTP v1 API).
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
  // If a specific userId is provided (for test notifications), use it directly
  if (userId) {
    userIds = [userId];
    console.log(`Sending direct WebSocket notification to user: ${userId}`);
  } else {
    // Otherwise, get all subscribers for the notification's topic
    const topicSubscribers = await queryItems(TABLES.TOPIC_SUBSCRIPTIONS, {
      IndexName: 'topic-id-index', // <-- FIXED: Use the correct GSI
      KeyConditionExpression: 'topic_id = :tid',
      ExpressionAttributeValues: { ':tid': notification.topic_id },
    });
    // Filter out any subscribers with a missing user_id to prevent errors
    userIds = topicSubscribers.map(s => s.user_id).filter(Boolean);
    console.log(`Found ${userIds.length} subscribers for topic ${notification.topic_id}`);
  }
  
  if (userIds.length === 0) {
    console.log('No WebSocket recipients found.');
    return { status: 'No recipients' };
  }

  // Get all active connections for these users
  const allConnections = (await Promise.all(
    userIds.map(uid => 
      queryItems(TABLES.WEBSOCKET_CONNECTIONS, { 
        IndexName: 'user-id-index', 
        KeyConditionExpression: 'user_id = :uid',
        ExpressionAttributeValues: { ':uid': uid }
      })
    )
  )).flat();
  
  if (allConnections.length === 0) {
    console.log('No active WebSocket connections for the recipients.');
    return { status: 'No active connections' };
  }

  const message = JSON.stringify({
    type: 'NEW_NOTIFICATION',
    notification,
  });

  const postCalls = allConnections.map(async ({ connection_id }) => {
    try {
      await apiGw.send(new PostToConnectionCommand({
        ConnectionId: connection_id,
        Data: message,
      }));
    } catch (e) {
      // 410 Gone indicates a stale connection. It's safe to delete.
      if (e.statusCode === 410) {
        await deleteItem(TABLES.WEBSOCKET_CONNECTIONS, { connection_id });
      } else {
        console.error(`Failed to post to connection ${connection_id}:`, e.message);
      }
    }
  });

  await Promise.all(postCalls);
  console.log(`Sent WebSocket notifications to ${allConnections.length} connections.`);
  return { sent_to: allConnections.length };
};


// ─── FCM v1 via SNS (FIXED PAYLOAD) ──────────────────────────────────────
/**
 * SNS publishes to a GCM (FCM) platform application.
 * The "GCM" key in the MessageStructure payload must contain a JSON string
 * whose top-level key is "message" following the FCM HTTP v1 API spec.
 * See: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages/send
 */
const sendSnsPush = async (notification) => {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    console.warn('SNS_TOPIC_ARN not set — skipping push notification.');
    return null;
  }

  const appUrl = process.env.CLOUDFRONT_URL || 'http://localhost:3000';

  // FCM HTTP v1 message object (correct structure)
  const fcmMessage = {
    message: {
      notification: {
        title: notification.title,
        body: notification.message || '',
      },
      data: {
        notificationId: notification.id,
        severity: notification.severity || 'medium',
        type: notification.type || 'general',
        topic_id: notification.topic_id || '',
        status: notification.status || 'new',
        created_at: notification.created_at || now(),
        click_action: appUrl,
      },
      webpush: {
        notification: {
          icon: `${appUrl}/mcm-logo.png`,
          badge: `${appUrl}/badge-icon.png`,
          tag: notification.id, // replaces older notification with same tag
          renotify: true,
        },
        fcm_options: {
          link: appUrl,
        },
      },
      android: {
        priority: notification.severity === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channel_id: 'mcm_alerts',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    },
  };

  const snsPayload = {
    default: `MCM Alert: ${notification.title}`,
    GCM: JSON.stringify(fcmMessage),   // ← FIXED: correct FCM v1 structure
  };

  try {
    const result = await snsClient.send(new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(snsPayload),
      MessageStructure: 'json',
      Subject: notification.title,
    }));
    console.log('FCM push sent via SNS:', result.MessageId);
    return { messageId: result.MessageId };
  } catch (err) {
    console.error('SNS push failed:', err.message, err.code);
    return { error: err.message };
  }
};

// ─── NOTIFICATION HANDLERS ────────────────────────────────────────────────

async function handleNotifications(method, path, body, user, cors) {
  const pathParts = path.split('/').filter(p => p && p !== 'prod');
  const base = pathParts[0]; // 'notifications'
  const second = pathParts[1]; // id, 'test', or undefined
  const third = pathParts[2]; // 'comments' or undefined

  const isTest = second === 'test';
  const notificationId = second && !isTest ? second : null;
  const isComments = third === 'comments';

  // ── POST /notifications (public webhook endpoint) ─────────────────────
  if (method === 'POST' && !second) {
    const { topic_id, topic_name, title, message, severity, type, metadata } = body;
    if (!title || !severity)
      return json(400, { error: 'title and severity are required' }, cors);

    let finalTopicId = topic_id || null;
    // If a topic_name is provided, find or create the topic
    if (topic_name && !finalTopicId) {
      const topicItems = await queryItems(TABLES.TOPICS, {
        IndexName: 'name-index',
        KeyConditionExpression: '#n = :name',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: { ':name': topic_name },
        Limit: 1,
      });
      if (topicItems.length > 0) {
        finalTopicId = topicItems[0].id;
      } else {
        // Topic not found, create it
        finalTopicId = newId();
        await putItem(TABLES.TOPICS, {
          id: finalTopicId,
          name: topic_name,
          created_at: now(),
          updated_at: now(),
        });
      }
    }

    // If no topic_id could be determined, use/create a "General" topic
    if (!finalTopicId) {
      const generalTopicName = 'General';
      const topicItems = await queryItems(TABLES.TOPICS, {
        IndexName: 'name-index',
        KeyConditionExpression: '#n = :name',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: { ':name': generalTopicName },
        Limit: 1,
      });
      if (topicItems.length > 0) {
        finalTopicId = topicItems[0].id;
      } else {
        // "General" topic not found, create it
        finalTopicId = newId();
        await putItem(TABLES.TOPICS, {
          id: finalTopicId,
          name: generalTopicName,
          created_at: now(),
          updated_at: now(),
        });
      }
    }

    const ts = now();
    const item = {
      id: newId(),
      topic_id: finalTopicId,
      title,
      message: message || '',
      severity: severity || 'medium',
      status: 'new',
      type: type || 'webhook',
      metadata: metadata || null,
      created_at: ts,
      updated_at: ts,
    };
    await putItem(TABLES.NOTIFICATIONS, item);

    // Fan out to both push and websocket
    const pushResult = await sendSnsPush(item);
    const wsResult = await sendWebSocketNotification(item);

    return json(201, { ...item, push_notification: pushResult, websocket_notification: wsResult }, cors);
  }

  // Auth required below
  if (!user) return json(401, { error: 'Unauthorized' }, cors);

  // ── POST /notifications/test ──────────────────────────────────────────
  if (method === 'POST' && isTest) {
    const ts = now();
    const item = {
      id: newId(),
      topic_id: 'test-notifications',
      title: 'Test Alert: Everything is Awesome!',
      message: 'This is a test notification to confirm your alert setup is working. No action required.',
      severity: 'low',
      status: 'new',
      type: 'manual',
      metadata: { sent_by: user.id },
      created_at: ts,
      updated_at: ts,
    };
    
    await putItem(TABLES.NOTIFICATIONS, item);
    
    const wsResult = await sendWebSocketNotification(item, user.id);
    const pushResult = await sendSnsPush(item);

    return json(201, { ...item, websocket_notification: wsResult, push_notification: pushResult }, cors);
  }

  // ── POST /notifications/:id/comments ─────────────────────────────────
  if (notificationId && isComments && method === 'POST') {
    const { text } = body;
    if (!text || !text.trim()) return json(400, { error: 'Comment text required' }, cors);
    const ts = now();
    const item = {
      notification_id: notificationId,
      created_at: ts,
      id: newId(),
      user_id: user.id,
      text: text.trim(),
    };
    await putItem(TABLES.COMMENTS, item);
    return json(201, item, cors);
  }

  // ── GET /notifications/:id ────────────────────────────────────────────
  if (notificationId && method === 'GET') {
    const notif = await getItem(TABLES.NOTIFICATIONS, { id: notificationId });
    if (!notif) return json(404, { error: 'Notification not found' }, cors);

    const comments = await queryItems(TABLES.COMMENTS, {
      KeyConditionExpression: 'notification_id = :nid',
      ExpressionAttributeValues: { ':nid': notificationId },
      ScanIndexForward: true,
    });
    notif.comments = comments;
    return json(200, notif, cors);
  }

  // ── PUT /notifications/:id ────────────────────────────────────────────
  if (notificationId && method === 'PUT') {
    const { status } = body;
    const valid = ['new', 'acknowledged', 'resolved'];
    if (!status || !valid.includes(status))
      return json(400, { error: `status must be one of: ${valid.join(', ')}` }, cors);

    const updated = await updateItem(
      TABLES.NOTIFICATIONS,
      { id: notificationId },
      { status, updated_at: now() }
    );
    return json(200, updated, cors);
  }

  // ── GET /notifications (list all) ─────────────────────────────────────
  if (method === 'GET') {
    // Query using status-created-index for each status, merge and sort
    const statuses = ['new', 'acknowledged', 'resolved'];
    const allItems = (await Promise.all(statuses.map(s =>
      queryItems(TABLES.NOTIFICATIONS, {
        IndexName: 'status-created-index',
        KeyConditionExpression: '#s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': s },
        ScanIndexForward: false,
        Limit: 100,
      })
    ))).flat();

    allItems.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const top200 = allItems.slice(0, 200);

    // Batch-fetch comments for all notifications
    const enriched = await Promise.all(top200.map(async (n) => {
      const comments = await queryItems(TABLES.COMMENTS, {
        KeyConditionExpression: 'notification_id = :nid',
        ExpressionAttributeValues: { ':nid': n.id },
        ScanIndexForward: true,
      });
      return { ...n, timestamp: n.created_at, comments };
    }));

    return json(200, enriched, cors);
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

  // Public endpoints
  const isPublic = method === 'POST' && path === '/notifications';

  let user = null;
  if (!isPublic) {
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) return json(401, { error: 'Unauthorized' }, cors);
    user = { id: claims.sub, email: claims.email, app_role: claims['custom:app_role'] || 'member' };
    // Upsert user
    const existing = await getItem(TABLES.USERS, { id: user.id });
    if (!existing) {
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
