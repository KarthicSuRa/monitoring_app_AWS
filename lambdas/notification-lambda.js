const { Pool } = require('pg');
// --- Database Configuration ---
let pool;
function initializePool() {
  if (pool) return;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}
// --- CORS Configuration ---
// WHY: Without matching origin headers on the preflight OPTIONS request,
// the browser blocks all requests. We allow localhost for dev and CloudFront for prod.
const getCorsHeaders = (event) => {
  const cloudfrontUrl = process.env.CLOUDFRONT_URL;
  const allowedOrigins = [
    'http://localhost:3000',
    cloudfrontUrl,
  ];
  const origin = event.headers?.origin;
  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    };
  }
  return {};
};
// --- Response Utility ---
const createResponse = (statusCode, body, corsHeaders) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
// --- Validation & Normalization ---
// WHY: Maps all possible severity/priority strings from external webhooks to our 3 valid values
const severityMap = {
  low: 'low', medium: 'medium', high: 'high',
  critical: 'high', info: 'low', warning: 'medium', error: 'high'
};
function validatePayload(data) {
  const errors = [];
  if (!data.title?.trim()) errors.push('Title is required');
  if (!data.message?.trim()) errors.push('Message is required');
  return { isValid: errors.length === 0, errors };
}
// --- OneSignal Push Notification Logic ---
// FIXED: Was a placeholder stub (empty comment body) — now fully implemented.
// FIXED: Now handles null topicId (global broadcast) instead of only topic-targeted pushes.
// FIXED: Passes severity, site, status in data payload so client toast renders correctly.
async function sendOneSignalNotification(client, topicId, notificationData) {
  const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
  const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!oneSignalAppId || !oneSignalApiKey) {
    console.warn('OneSignal credentials not configured. Skipping push notification.');
    return null;
  }
  // HOW IT WORKS:
  // - topicId present → filter by tag `topic_<id>` (only subscribed users get it)
  // - topicId null    → broadcast filter: all users active in the last 30 days
  const filters = topicId
    ? [{ field: 'tag', key: `topic_${topicId}`, relation: 'exists' }]
    : [{ field: 'last_session', relation: '>', hours_ago: '720' }];
  const payload = {
    app_id: oneSignalAppId,
    filters,
    headings: { en: notificationData.title },
    contents: { en: notificationData.message },
    // HOW IT WORKS: This 'data' object is passed through to:
    //   - sw.js notificationclick handler (for deep-linking)
    //   - oneSignalService.ts foreground handler (for correct toast colour)
    data: {
      notificationId: notificationData.id,
      severity: notificationData.severity,   // → correct toast colour on client
      type: notificationData.type,
      site: notificationData.site || null,
      topic_id: topicId,
      status: notificationData.status,
    },
  };
  try {
    const https = require('https');
    const body = JSON.stringify(payload);
    const options = {
      hostname: 'onesignal.com',
      path: '/api/v1/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    return await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  } catch (pushError) {
    console.error('Failed to send OneSignal push notification:', pushError.message);
    return null; // Non-fatal: notification is still saved to DB
  }
}
// --- Main Lambda Handler ---
exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return createResponse(403, { error: 'Origin not allowed' }, {});
  }
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' }, corsHeaders);
  }
  let client;
  try {
    initializePool();
    const data = JSON.parse(event.body || '{}');
    const { isValid, errors } = validatePayload(data);
    if (!isValid) {
      return createResponse(400, { error: 'Validation failed', details: errors }, corsHeaders);
    }
    client = await pool.connect();
    // Resolve topic — by ID or by name (for external webhook compatibility)
    let resolvedTopicId = data.topic_id?.trim() || null;
    if (data.topic_name && !resolvedTopicId) {
      const topicResult = await client.query(
        'SELECT id FROM topics WHERE name = $1', [data.topic_name.trim()]
      );
      if (topicResult.rows.length === 0) {
        return createResponse(400, { error: `Invalid topic name: "${data.topic_name}"` }, corsHeaders);
      }
      resolvedTopicId = topicResult.rows[0].id;
    }
    const newNotification = {
      title: data.title.trim(),
      message: data.message.trim(),
      severity: severityMap[String(data.severity || data.priority || 'medium').toLowerCase()] || 'medium',
      status: 'new',
      type: data.type || 'custom',
      site: data.site?.trim() || null,
      topic_id: resolvedTopicId,
      metadata: data.metadata || null,
    };
    const insertResult = await client.query(
      `INSERT INTO notifications (title, message, severity, status, type, site, topic_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      Object.values(newNotification)
    );
    const insertedNotification = insertResult.rows[0];
    // FIXED: Always send push — was only sending if topicId was set.
    // Now global alerts (null topicId) broadcast to all active users.
    const pushResult = await sendOneSignalNotification(client, resolvedTopicId, insertedNotification);
    return createResponse(201, {
      success: true,
      data: insertedNotification,
      push_notification: pushResult
    }, corsHeaders);
  } catch (error) {
    console.error('Notification Lambda failed:', error);
    return createResponse(500, { error: 'Internal server error', message: error.message }, corsHeaders);
  } finally {
    if (client) client.release();
  }
};