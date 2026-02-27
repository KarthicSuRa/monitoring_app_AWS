import { Pool } from "pg";

// Database connection pool, initialized lazily.
let pool;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    ssl: { rejectUnauthorized: false }, // Adjust as required
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

// --- Adyen Specific Logic (Identical to original) ---
function shouldNotifyAdyen(eventCode, success) {
  const isSuccess = success === "true";
  const failureEvents = ["CAPTURE_FAILED", "REFUND_FAILED", "CHARGEBACK", "NOTIFICATION_OF_CHARGEBACK"];
  const failureOnlyEvents = ["AUTHORISATION", "CAPTURE", "REFUND", "CANCELLATION"];
  return failureEvents.includes(eventCode) || (failureOnlyEvents.includes(eventCode) && !isSuccess);
}

function transformAdyenPayload(payload) {
  const item = payload.notificationItems?.[0]?.NotificationRequestItem;
  if (!item) return null;

  const { eventCode, success, amount, pspReference, merchantAccountCode, merchantReference, reason } = item;
  if (!shouldNotifyAdyen(eventCode, success)) return null;

  const title = `${eventCode} - ${merchantAccountCode}`;
  const formattedAmount = amount ? `${amount.currency} ${amount.value / 100}` : "";

  let messageLines = [];
  switch (eventCode) {
    case "AUTHORISATION":
      messageLines = [`❌ Authorization Failed`, `Amount: ${formattedAmount}`, `PSP: ${pspReference}`, `Merchant Ref: ${merchantReference}`];
      break;
    case "CHARGEBACK":
      messageLines = [`🚨 CHARGEBACK RECEIVED`, `PSP: ${pspReference}`, `Merchant Ref: ${merchantReference}`, `⚠️ Review and supply defense documents ASAP`];
      break;
    default:
      messageLines = [`❌ Event Failed: ${eventCode}`, `PSP: ${pspReference}`, `Merchant Ref: ${merchantReference}`, reason ? `Reason: ${reason}` : ""];
  }

  return {
    title,
    message: messageLines.filter(Boolean).join("\n"),
    severity: "high",
    metadata: { merchantAccountCode, merchantReference, pspReference, eventCode, success, amount: formattedAmount, failure: true },
  };
}

// --- Generic Webhook Logic (Identical to original) ---
function transformGenericPayload(payload) {
  const isFailure = payload?.severity?.toLowerCase() === "high" || payload?.status === "failed" || payload?.error;
  if (!isFailure) return null;

  const title = payload.eventName || payload.title || "Webhook Failure";
  let message = payload.message || payload.summary || payload.error;
  if (!message) {
    const raw = JSON.stringify(payload, null, 2);
    message = raw.length > 500 ? raw.substring(0, 500) + "..." : raw;
  }

  return {
    title,
    message,
    severity: "high",
    metadata: { failure: true },
  };
}

// --- Lambda Handler ---
export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return createResponse(200, {});
  }
  if (event.requestContext?.http?.method !== "POST") {
    return createResponse(405, { error: "Method Not Allowed" });
  }

  let client;
  try {
    const sourceId = event.queryStringParameters?.source_id;
    if (!sourceId) {
      return createResponse(400, { error: "Missing required 'source_id' query parameter." });
    }

    initializePool();
    client = await pool.connect();

    // 1. Validate the webhook source
    const sourceResult = await client.query("SELECT id, source_type, topic_id FROM webhook_sources WHERE id = $1", [sourceId]);
    if (sourceResult.rows.length === 0) {
      return createResponse(404, { error: "Invalid or unauthorized 'source_id'." });
    }
    const source = sourceResult.rows[0];

    // 2. Log the raw webhook event (Identical to original)
    const payload = JSON.parse(event.body || "{}");
    await client.query("INSERT INTO webhook_events (source_id, payload) VALUES ($1, $2)", [sourceId, payload]);

    // 3. Transform the payload (Identical to original)
    let notification = null;
    if (source.source_type === "adyen") {
      notification = transformAdyenPayload(payload);
    } else {
      notification = transformGenericPayload(payload);
    }

    // 4. Insert notification directly if criteria met (Identical to original)
    if (notification && source.topic_id) {
      const finalMetadata = { ...notification.metadata, sourceType: source.source_type };

      await client.query(
        `INSERT INTO notifications (topic_id, title, message, severity, type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [source.topic_id, notification.title, notification.message, notification.severity, "webhook", finalMetadata]
      );
    }

    return createResponse(200, { message: "Webhook processed successfully" });

  } catch (error) {
    console.error("Webhook Lambda failed:", error);
    return createResponse(500, { error: "Internal server error", message: error.message });

  } finally {
    if (client) client.release();
  }
};
