// lambdas/monitoring-lambda.js

const { Pool } = require('pg');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// --- Centralized CORS configuration (from api-lambda.js) ---
const getCorsHeaders = (event) => {
    const origin = (event.headers || {}).origin || (event.headers || {}).Origin || '';
    const cloudfrontUrl = process.env.CLOUDFRONT_URL ? process.env.CLOUDFRONT_URL.replace(/\/$/, '') : '';
    const normalizedOrigin = origin.replace(/\/$/, '');
    const allowedOrigins = [cloudfrontUrl, 'http://localhost:3000'].filter(Boolean);

    if (origin && (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes(origin))) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Credentials': 'true',
        };
    }
    return {}; // Return empty if origin is not allowed
};

const jsonResponse = (statusCode, body, corsHeaders = {}) => ({
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
});


// --- Database & Config (from api-lambda.js) ---
let pool;
const FAKE_USER_AGENT = 'MCM Monitor Alerts';

const initializePool = () => {
  if (pool) return;
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  // Add diagnostic logging
  console.log('[DIAG_DB_ENV] DB_HOST:', DB_HOST ? 'SET' : 'MISSING');
  console.log('[DIAG_DB_ENV] DB_PORT:', DB_PORT ? 'SET' : 'MISSING');
  console.log('[DIAG_DB_ENV] DB_NAME:', DB_NAME ? 'SET' : 'MISSING');
  console.log('[DIAG_DB_ENV] DB_USER:', DB_USER ? 'SET' : 'MISSING');
  console.log('[DIAG_DB_ENV] DB_PASSWORD:', DB_PASSWORD ? 'SET (hidden)' : 'MISSING');

  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      console.error('[DIAG_DB_ENV] FATAL: One or more required DB env vars are missing.');
      throw new Error('Database connection environment variables are not fully set.');
  }
  pool = new Pool({
      connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
  });
  console.log('[DIAG_DB_ENV] Database pool created successfully.');
};

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

// --- Monitoring Logic (original from monitoring-lambda) ---

const fireDownAlert = async (client, site, errorMessage) => {
    const recent = await client.query(
    `SELECT id FROM notifications
     WHERE type = 'site_alert'
       AND site = $1
       AND status != 'resolved'
       AND created_at > NOW() - INTERVAL '10 minutes'
     LIMIT 1`,
    [site.name]
  );
  if (recent.rows.length > 0) {
    console.log(`⏭️  Skipping duplicate alert for ${site.name} (recent unresolved alert exists).`);
    return;
  }
  console.log(`🚨 Firing down alert for site: ${site.name}`);
  const notificationPayload = {
    title: `🔴 Site Down: ${site.name}`,
    message: `\"${site.name}\" (${site.country || 'Unknown region'}) is unreachable. Error: ${errorMessage || 'No details available.'}`,
    severity: 'high',
    type: 'site_alert',
    site: site.name,
    topic_name: 'Site Monitoring',
  };
  const apiGatewayEvent = {
    httpMethod: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'origin': process.env.CLOUDFRONT_URL || 'http://localhost:3000',
    },
    body: JSON.stringify(notificationPayload),
  };
  try {
    const result = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: process.env.NOTIFICATION_LAMBDA_NAME,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(apiGatewayEvent)),
      })
    );
    const responsePayload = result.Payload
      ? JSON.parse(Buffer.from(result.Payload).toString())
      : null;
    if (result.FunctionError) {
      console.error(`❌ notification-lambda error for ${site.name}:`, responsePayload);
    } else {
      console.log(`✅ Alert fired for ${site.name}. Status: ${responsePayload?.statusCode}`);
    }
  } catch (invokeErr) {
    console.error(`❌ Failed to invoke notification-lambda for ${site.name}:`, invokeErr.message);
  }
};

const runMonitoringCheck = async (client) => {
    const { rows: sites } = await client.query(
    `SELECT id, url, name, country FROM monitored_sites WHERE is_paused = false`
  );
  console.log(`🔍 Checking ${sites.length} active sites...`);
  const results = await Promise.all(
    sites.map(async (site) => {
      const start = Date.now();
      let status_code = 0, is_up = false, response_time_ms = 0,
          status_text = '', error_message = null;
      try {
        const response = await fetch(site.url, {
          method: 'GET',
          headers: { 'User-Agent': FAKE_USER_AGENT },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
        response_time_ms = Date.now() - start;
        status_code = response.status;
        status_text = response.statusText;
        is_up = response.ok;
        if (!is_up) error_message = `Server responded with status: ${status_code} ${status_text}`;
      } catch (e) {
        response_time_ms = Date.now() - start;
        error_message = e.message;
        is_up = false;
      }
      return { site, is_up, response_time_ms, status_code, status_text, error_message };
    })
  );
  if (results.length > 0) {
    const insertQuery = `
      INSERT INTO ping_logs (site_id, is_up, response_time_ms, status_code, status_text, error_message)
      VALUES ${results.map((_, i) =>
        `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
      ).join(',')}\n
    `;
    const values = results.flatMap(r => [
      r.site.id, r.is_up, r.response_time_ms, r.status_code, r.status_text, r.error_message
    ]);
    await client.query(insertQuery, values);
  }
  const downSites = results.filter(r => !r.is_up);
  if (downSites.length > 0) {
    console.log(`🚨 DOWN: ${downSites.map(r => r.site.name).join(', ')}`);
    await Promise.all(downSites.map(r => fireDownAlert(client, r.site, r.error_message)));
  } else {
    console.log('✅ All sites are UP.');
  }
  return {
    message: `Checked ${sites.length} sites. ${downSites.length} down.`,
    down: downSites.map(r => r.site.name),
  };
};

// --- Main Lambda Handler (structured like api-lambda.js) ---

exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // A check to prevent API access if the origin is not allowed.
  const requestOrigin = (event.headers || {}).origin || '';
  if (requestOrigin && !corsHeaders['Access-Control-Allow-Origin']) {
      return jsonResponse(403, { error: 'CORS error: Origin not allowed' }, {});
  }
  
  // Differentiate between API call and scheduled task
  const isApiGatewayEvent = event.requestContext && event.requestContext.apiId;

  let client;
  try {
    console.log(`[DIAG_REQUEST] ${isApiGatewayEvent ? `${event.httpMethod} ${event.path}` : 'Scheduled Event'}`);
    initializePool();

    console.log('[DIAG_POOL_CONNECT] Attempting DB connection...');
    client = await pool.connect();
    console.log('[DIAG_POOL_CONNECT] DB connection acquired successfully.');

    // The logic is always to run a check.
    const checkResult = await runMonitoringCheck(client);

    if (isApiGatewayEvent) {
      // If called via API, return the result with a 200 status.
      return jsonResponse(200, checkResult, corsHeaders);
    } else {
      // If a scheduled task, just log completion. No return value needed.
      console.log('Scheduled monitoring check completed successfully.');
    }

  } catch (err) {
    // Use the same detailed logging as api-lambda
    console.error('[DIAG_FATAL] Unhandled error in Lambda handler:');
    console.error('[DIAG_FATAL] message:', err.message);
    console.error('[DIAG_FATAL] name:   ', err.name);
    console.error('[DIAG_FATAL] stack:  ', err.stack);
    
    if (isApiGatewayEvent) {
        return jsonResponse(500, {
            error: 'Internal Server Error',
            details: err.message,
        }, corsHeaders);
    } else {
        // For scheduled events, re-throw the error to mark the invocation as failed in AWS.
        throw err;
    }
  } finally {
    if (client) {
        console.log('[DIAG_POOL_CONNECT] Releasing DB client.');
        client.release();
    }
  }
};
