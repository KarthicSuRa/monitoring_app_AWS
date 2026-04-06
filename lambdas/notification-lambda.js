/**
 * notification-lambda.js  (DynamoDB rewrite + FCM v1 SNS fix)
 * Handles: GET/POST /notifications, PUT /notifications/:id,
 *          POST /notifications/:id/comments, POST /notifications/test
 *
 * FIXED: SNS FCM v1 payload now uses the correct structure that AWS SNS
 * expects when Platform = GCM (FCM HTTP v1 API).
 */
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const {
  TABLES, now, newId,
  getItem, putItem, updateItem, deleteItem,
  queryItems, scanItems,
} = require('./dynamo-client');

const snsClient = new SNSClient({});

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
    if (topic_name && !finalTopicId) {
      const topicItems = await queryItems(TABLES.TOPICS, {
        IndexName: 'name-index',
        KeyConditionExpression: '#n = :name',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: { ':name': topic_name },
        Limit: 1,
      });
      if (topicItems.length > 0) finalTopicId = topicItems[0].id;
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
    const pushResult = await sendSnsPush(item);
    return json(201, { ...item, push_notification: pushResult }, cors);
  }

  // ── POST /notifications/test ──────────────────────────────────────────
  if (method === 'POST' && isTest) {
    let topicId = null;
    const topicItems = await queryItems(TABLES.TOPICS, {
      IndexName: 'name-index',
      KeyConditionExpression: '#n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': 'Site Monitoring' },
      Limit: 1,
    });
    if (topicItems.length > 0) topicId = topicItems[0].id;

    const ts = now();
    const item = {
      id: newId(),
      topic_id: topicId,
      title: 'Test Alert: Everything is Awesome!',
      message: 'This is a test notification to confirm your alert setup is working. No action required.',
      severity: 'low',
      status: 'new',
      type: 'manual',
      metadata: null,
      created_at: ts,
      updated_at: ts,
    };
    await putItem(TABLES.NOTIFICATIONS, item);
    const pushResult = await sendSnsPush(item);
    return json(201, { ...item, push_notification: pushResult }, cors);
  }

  // Auth required below
  if (!user) return json(401, { error: 'Unauthorized' }, cors);

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
  const isPublic = method === 'POST' && (path === '/notifications' || path === '/notifications/test');

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
