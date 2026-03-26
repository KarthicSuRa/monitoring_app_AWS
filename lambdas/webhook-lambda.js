const { Pool } = require('pg');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Adyen-HMAC-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

let pool;
function initializePool() {
  if (pool) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set.');
  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

function transformAdyenPayload(payload) {
    const notification = payload.notificationItems?.[0]?.NotificationRequestItem;
    if (!notification) return null;

    const { eventCode, amount, pspReference, reason, success } = notification;
    const isSuccess = success === 'true';
    const formattedAmount = `${amount.currency} ${(amount.value / 100).toFixed(2)}`;

    let title, message, severity, lines = [];

    switch (eventCode) {
        case 'AUTHORISATION':
            title = isSuccess ? `✅ Auth Success` : `❌ Auth Failed`;
            lines = [
                isSuccess ? `Payment of ${formattedAmount} authorized.` : `Auth for ${formattedAmount} failed. Reason: ${reason || 'Unknown'}`,
                `PSP Ref: ${pspReference}`
            ];
            severity = isSuccess ? 'low' : 'medium';
            break;
        case 'CAPTURE':
            title = isSuccess ? `💰 Payment Captured` : `❌ Capture Failed`;
            lines = [
                isSuccess ? `Captured ${formattedAmount}.` : `Capture for ${formattedAmount} failed. Reason: ${reason || 'Unknown'}`,
                `PSP Ref: ${pspReference}`
            ];
            severity = isSuccess ? 'low' : 'high';
            break;
        case 'CAPTURE_FAILED':
            title = `❌ Capture Failed`;
            lines = [
                `Capture for ${formattedAmount} failed.`,
                `Reason: ${reason || 'No reason provided.'}`,
                `PSP Ref: ${pspReference}`
            ];
            severity = 'high';
            break;
        case 'REFUND':
            title = isSuccess ? `↩️ Refund Processed` : `❌ Refund Failed`;
            lines = [
                isSuccess ? `Refund of ${formattedAmount} processed.` : `Refund for ${formattedAmount} failed. Reason: ${reason || 'Unknown'}`,
                `PSP Ref: ${pspReference}`
            ];
            severity = isSuccess ? 'low' : 'medium';
            break;
        default:
            return null;
    }

    message = lines.join('\n');
    return { title: `${title} (${notification.merchantAccountCode})`, message, severity, metadata: notification };
}

function transformGenericPayload(payload) {
    const { title, message, severity, status, ...metadata } = payload;
    if (!title || !message) return null;

    const isFailure = severity === 'high' || severity === 'critical' || status === 'failed' || status === 'error' || !!payload.error;
    const finalSeverity = severity === 'critical' ? 'high' : (severity || (isFailure ? 'medium' : 'low'));

    return { title, message, severity: finalSeverity, metadata };
}

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const { source_id } = event.queryStringParameters || {};
  if (!source_id) return createResponse(400, { error: 'Missing source_id query parameter' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return createResponse(400, { error: 'Request body is not valid JSON.' });
  }

  initializePool();
  const client = await pool.connect();
  try {
    const { rows: [source] } = await client.query('SELECT * FROM public.webhook_sources WHERE id = $1', [source_id]);
    if (!source) return createResponse(404, { error: 'Webhook source not found' });

    let notification;
    switch (source.source_type) {
        case 'adyen':
            notification = transformAdyenPayload(payload);
            break;
        case 'generic':
        case 'pagerduty':
        case 'github':
            notification = transformGenericPayload(payload);
            break;
        default:
            console.warn(`Webhook source ${source.id} has unknown type ${source.source_type}. Treating as generic.`);
            notification = transformGenericPayload(payload);
    }

    if (!notification) {
      console.log(`Payload from source ${source.id} did not match expected format. No notification created.`);
      return createResponse(200, { message: 'Payload received, but no actionable event found.' });
    }

    const finalMetadata = { webhook_source_id: source.id, ...notification.metadata };

    await client.query(
        `INSERT INTO public.notifications (topic_id, title, message, severity, status, type, metadata)
         VALUES ($1, $2, $3, $4, 'new', 'webhook', $5)`,
        [source.topic_id, notification.title, notification.message, notification.severity, finalMetadata]
    );
    
    console.log(`✅ Notification created from webhook source: ${source.name} (${source.id})`);
    return createResponse(201, { success: true });

  } catch (err) {
    console.error('FATAL webhook-lambda error:', err);
    return createResponse(500, { error: 'Internal Server Error' });
  } finally {
    client.release();
  }
};