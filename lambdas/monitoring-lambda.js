// monitoring-lambda.js
// WHY CommonJS: AWS Lambda Node.js runtime uses CommonJS by default.
// Using ESM (import/export) without "type":"module" causes a runtime crash.
const { Pool } = require('pg');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const FAKE_USER_AGENT = 'MCM Monitor Alerts';
let pool;
function initializePool() {
  if (pool) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL environment variable is not set.');
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
// ─── Fetch single site data (API Gateway path) ───────────────────────────────
const fetchSiteData = async (client, siteId) => {
  const { rows: [site] } = await client.query(
    'SELECT * FROM monitored_sites WHERE id = $1', [siteId]
  );
  if (!site) {
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Site not found' }),
    };
  }
  const { rows: pingLogs } = await client.query(
    'SELECT * FROM ping_logs WHERE site_id = $1 ORDER BY checked_at DESC LIMIT 100',
    [siteId]
  );
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ...site, ping_logs: pingLogs }),
  };
};
// ─── Fire a site-down notification ──────────────────────────────────────────
const fireDownAlert = async (client, site, errorMessage) => {
  // ✅ DEDUPLICATION: If an unresolved site_alert for this site was created
  // in the last 10 minutes, skip it — prevents 1 alert per minute spam.
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
    message: `"${site.name}" (${site.country || 'Unknown region'}) is unreachable. Error: ${errorMessage || 'No details available.'}`,
    severity: 'high',
    type: 'site_alert',
    site: site.name,
    topic_name: 'Site Monitoring',
  };
  // ✅ FIXED: Wrap payload in API Gateway HTTP event format.
  // notification-lambda reads event.httpMethod and JSON.parse(event.body).
  // Previously this was a raw object — undefined httpMethod → Lambda returned 405/500.
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
        InvocationType: 'RequestResponse', // Wait so we can log errors
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
// ─── Scheduled monitoring check ─────────────────────────────────────────────
const runMonitoringCheck = async (client) => {
  // ✅ FIXED: Removed broken WHERE status = 'active' (column doesn't exist)
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
          signal: AbortSignal.timeout(15000), // ✅ 15s timeout
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
  // Bulk insert all ping results
  if (results.length > 0) {
    const insertQuery = `
      INSERT INTO ping_logs (site_id, is_up, response_time_ms, status_code, status_text, error_message)
      VALUES ${results.map((_, i) =>
        `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
      ).join(',')}
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
    statusCode: 200,
    body: JSON.stringify({
      message: `Checked ${sites.length} sites. ${downSites.length} down.`,
      down: downSites.map(r => r.site.name),
    }),
  };
};
// ─── Main Lambda Handler ─────────────────────────────────────────────────────
// ✅ FIXED: CommonJS exports.handler (not ESM export const handler)
exports.handler = async (event) => {
  initializePool();
  const client = await pool.connect();
  try {
    if (event.queryStringParameters?.siteId) {
      console.log(`API request for siteId: ${event.queryStringParameters.siteId}`);
      return await fetchSiteData(client, event.queryStringParameters.siteId);
    }
    console.log('Scheduled monitoring task started.');
    return await runMonitoringCheck(client);
  } catch (error) {
    console.error('Lambda execution failed:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    client.release();
  }
};