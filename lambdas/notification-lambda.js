import { Pool } from "pg";

// Database connection pool, initialized lazily.
let pool;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mapping for normalizing severity inputs.
const severityMap = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "high",
  info: "low",
  warning: "medium",
  error: "high"
};

/**
 * Initializes the database connection pool using the DATABASE_URL environment variable.
 */
function initializePool() {
  if (pool) return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable not set.");
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Adjust as required by your RDS SSL configuration
  });
}

/**
 * Creates a standardized HTTP response.
 */
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Validates the incoming notification payload.
 */
function validatePayload(data) {
  const errors = [];
  if (!data.title?.trim()) errors.push("Title is required");
  if (!data.message?.trim()) errors.push("Message is required");
  return { isValid: errors.length === 0, errors };
}

/**
 * Sends a push notification via OneSignal to all subscribed users of a topic.
 */
async function sendOneSignalNotification(client, topicId, notificationData) {
  console.log(`Starting push notification process for topic: ${topicId}`);

  const { ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY } = process.env;
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return { status: "skipped", reason: "onesignal_not_configured" };
  }

  // 1. Get all users subscribed to the topic
  const subResult = await client.query(
    "SELECT user_id FROM topic_subscriptions WHERE topic_id = $1",
    [topicId]
  );
  if (subResult.rows.length === 0) {
    return { status: "skipped", reason: "no_subscribers" };
  }
  const userIds = subResult.rows.map((s) => s.user_id);

  // 2. Get the OneSignal Player IDs for those users who have push notifications enabled
  const playerResult = await client.query(
    "SELECT onesignal_player_id FROM user_notification_preferences WHERE user_id = ANY($1) AND push_notifications = true AND onesignal_player_id IS NOT NULL",
    [userIds]
  );
  if (playerResult.rows.length === 0) {
    return { status: "skipped", reason: "no_push_enabled_users" };
  }
  const playerIds = playerResult.rows.map((p) => p.onesignal_player_id);

  // 3. Send the notification via OneSignal API
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: playerIds,
    headings: { en: notificationData.title },
    contents: { en: notificationData.message },
    subtitle: { en: `Site: ${notificationData.site || "General"} | Severity: ${notificationData.severity}` },
    data: { notificationId: notificationData.id, ...notificationData },
  };

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("OneSignal API Error:", errorBody);
    throw new Error(`OneSignal API request failed: ${JSON.stringify(errorBody)}`);
  }

  const result = await response.json();
  return { status: "sent", onesignal_id: result.id, recipients: result.recipients || 0 };
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return createResponse(200, {});
  }
  if (event.requestContext?.http?.method !== "POST") {
    return createResponse(405, { error: "Method Not Allowed" });
  }

  let client;

  try {
    initializePool();
    const data = JSON.parse(event.body || "{}");

    const { isValid, errors } = validatePayload(data);
    if (!isValid) {
      return createResponse(400, { error: "Validation failed", details: errors });
    }

    client = await pool.connect();

    // Resolve Topic ID if topic_name is provided
    let resolvedTopicId = data.topic_id?.trim() || null;
    if (data.topic_name && !resolvedTopicId) {
      const topicResult = await client.query("SELECT id FROM topics WHERE name = $1", [data.topic_name.trim()]);
      if (topicResult.rows.length === 0) {
        return createResponse(400, { error: `Invalid topic name: "${data.topic_name}"` });
      }
      resolvedTopicId = topicResult.rows[0].id;
    }

    // Insert notification into the database
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

    // Send push notification if applicable
    let pushResult = null;
    if (resolvedTopicId) {
      pushResult = await sendOneSignalNotification(client, resolvedTopicId, insertedNotification);
    }

    return createResponse(201, { success: true, data: insertedNotification, push_notification: pushResult });

  } catch (error) {
    console.error("Notification Lambda failed:", error);
    return createResponse(500, { error: "Internal server error", message: error.message });

  } finally {
    if (client) client.release();
  }
};
