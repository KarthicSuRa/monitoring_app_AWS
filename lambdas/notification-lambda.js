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
const severityMap = { low: "low", medium: "medium", high: "high", critical: "high", info: "low", warning: "medium", error: "high" };

function validatePayload(data) {
  const errors = [];
  if (!data.title?.trim()) errors.push("Title is required");
  if (!data.message?.trim()) errors.push("Message is required");
  return { isValid: errors.length === 0, errors };
}

// --- OneSignal Push Notification Logic ---
async function sendOneSignalNotification(client, topicId, notificationData) {
    // ... [rest of the function is unchanged, it is correct]
}

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return createResponse(403, { error: "Origin not allowed" }, {});
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: "Method Not Allowed" }, corsHeaders);
  }

  let client;
  try {
    initializePool();
    const data = JSON.parse(event.body || "{}");

    const { isValid, errors } = validatePayload(data);
    if (!isValid) {
      return createResponse(400, { error: "Validation failed", details: errors }, corsHeaders);
    }

    client = await pool.connect();

    let resolvedTopicId = data.topic_id?.trim() || null;
    if (data.topic_name && !resolvedTopicId) {
      const topicResult = await client.query("SELECT id FROM topics WHERE name = $1", [data.topic_name.trim()]);
      if (topicResult.rows.length === 0) {
        return createResponse(400, { error: `Invalid topic name: "${data.topic_name}"` }, corsHeaders);
      }
      resolvedTopicId = topicResult.rows[0].id;
    }

    const newNotification = {
      title: data.title.trim(),
      message: data.message.trim(),
      severity: severityMap[String(data.severity || data.priority || "medium").toLowerCase()] || "medium",
      status: "new",
      type: data.type || "custom",
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

    let pushResult = null;
    if (resolvedTopicId) {
      pushResult = await sendOneSignalNotification(client, resolvedTopicId, insertedNotification);
    }

    return createResponse(201, { success: true, data: insertedNotification, push_notification: pushResult }, corsHeaders);

  } catch (error) {
    console.error("Notification Lambda failed:", error);
    return createResponse(500, { error: "Internal server error", message: error.message }, corsHeaders);

  } finally {
    if (client) client.release();
  }
};