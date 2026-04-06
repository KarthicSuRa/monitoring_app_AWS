/**
 * monitoring-lambda.js  (DynamoDB rewrite)
 * Checks all active MCM sites, writes ping logs to DynamoDB,
 * fires alerts via notification-lambda for downed sites.
 */
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { TABLES, now, newId, ttlDays, scanItems, putItem, updateItem, queryItems } = require('./dynamo-client');

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const getCorsHeaders = (event) => {
  const origin = (event?.headers || {}).origin || (event?.headers || {}).Origin || '';
  const cf = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
  const allowed = [cf, 'http://localhost:3000'].filter(Boolean);
  if (origin && allowed.includes(origin.replace(/\/$/, ''))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    };
  }
  return {};
};

const json = (status, body, cors = {}) => ({
  statusCode: status,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {}),
});

/** Fires a "site down" alert via notification-lambda, deduplicating within 10 min */
async function fireDownAlert(site, errorMessage) {
  // Check for recent unresolved alert for this site (dedup)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recentAlerts = await queryItems(TABLES.NOTIFICATIONS, {
    IndexName: 'status-created-index',
    KeyConditionExpression: '#s = :s AND created_at >= :since',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'new', ':since': tenMinAgo },
    Limit: 50,
  });

  const duplicate = recentAlerts.find(
    a => a.type === 'site_alert' && a.metadata?.site_id === site.id
  );
  if (duplicate) {
    console.log(`Skipping duplicate alert for ${site.name}`);
    return;
  }

  console.log(`Firing down alert for: ${site.name}`);

  const payload = {
    httpMethod: 'POST',
    path: '/notifications',
    headers: {
      'Content-Type': 'application/json',
      origin: process.env.CLOUDFRONT_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      title: `🔴 Site Down: ${site.name}`,
      message: `"${site.name}" (${site.country || 'Unknown'}) is unreachable. Error: ${errorMessage || 'No details.'}`,
      severity: 'high',
      type: 'site_alert',
      topic_name: 'Site Monitoring',
      metadata: { site_name: site.name, site_id: site.id, region: site.country },
    }),
    requestContext: {},
  };

  try {
    const result = await lambdaClient.send(new InvokeCommand({
      FunctionName: process.env.NOTIFICATION_LAMBDA_NAME,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    }));
    const resp = result.Payload ? JSON.parse(Buffer.from(result.Payload).toString()) : null;
    if (result.FunctionError || (resp && resp.statusCode >= 400)) {
      console.error(`Notification lambda error for ${site.name}:`, resp);
    } else {
      console.log(`Alert sent for ${site.name}`);
    }
  } catch (err) {
    console.error(`Invoke notification lambda failed for ${site.name}:`, err.message);
  }
}

async function runMonitoringCheck() {
  const sites = await scanItems(TABLES.MONITORED_SITES);
  const activeSites = sites.filter(s => !s.is_paused);
  console.log(`Checking ${activeSites.length} active sites...`);

  const results = await Promise.all(activeSites.map(async (site) => {
    try {
      const invokeResult = await lambdaClient.send(new InvokeCommand({
        FunctionName: process.env.CHECKER_LAMBDA_NAME,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify({ url: site.url })),
      }));
      const payload = JSON.parse(Buffer.from(invokeResult.Payload).toString());
      if (invokeResult.FunctionError || (payload && payload.statusCode >= 400)) {
        const errMsg = payload?.body ? JSON.parse(payload.body).error : 'Checker lambda failed';
        return { site, is_up: false, response_time_ms: 0, status_code: 0, status_text: 'Lambda Error', error_message: errMsg };
      }
      return { site, ...payload };
    } catch (e) {
      return { site, is_up: false, response_time_ms: 0, status_code: 0, status_text: 'Invocation Error', error_message: e.message };
    }
  }));

  // Write ping logs to DynamoDB
  const ts = now();
  const expire90d = ttlDays(90);
  await Promise.all(results.map(r => {
    // Use unique log_id as sort key suffix so multiple checks per second don't overwrite
    const logId = newId().slice(0, 8);
    return putItem(TABLES.PING_LOGS, {
      site_id: r.site.id,
      checked_at: `${ts}#${logId}`,   // composite SK for uniqueness
      checked_at_iso: ts,              // clean ISO timestamp for frontend display
      is_up: r.is_up,
      response_time_ms: r.response_time_ms,
      status_code: r.status_code,
      status_text: r.status_text,
      error_message: r.error_message || null,
      ttl: expire90d,
    });
  }));

  // ── Update each site's status + last_checked_at in MONITORED_SITES ────────
  await Promise.all(results.map(r =>
    updateItem(TABLES.MONITORED_SITES, { id: r.site.id }, {
      status: r.is_up ? 'online' : 'offline',
      last_checked_at: ts,
      last_response_time_ms: r.response_time_ms,
      last_status_code: r.status_code,
      updated_at: ts,
    })
  ));

  // Fire down alerts
  const downSites = results.filter(r => !r.is_up);
  if (downSites.length > 0) {
    console.log(`DOWN: ${downSites.map(r => r.site.name).join(', ')}`);
    await Promise.all(downSites.map(r => fireDownAlert(r.site, r.error_message)));
  } else {
    console.log('All sites are UP.');
  }

  return {
    message: `Checked ${activeSites.length} sites. ${downSites.length} down.`,
    down: downSites.map(r => r.site.name),
    checked_at: ts,
  };
}

exports.handler = async (event) => {
  const cors = getCorsHeaders(event);

  if (event?.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: cors, body: '' };

  const isApiGateway = !!event?.requestContext?.apiId;
  if (isApiGateway) {
    const reqOrigin = (event.headers || {}).origin || '';
    if (reqOrigin && !cors['Access-Control-Allow-Origin'])
      return json(403, { error: 'CORS: Origin not allowed' });
  }

  try {
    const result = await runMonitoringCheck();
    if (isApiGateway) return json(200, result, cors);
    console.log('Scheduled check done:', result.message);
  } catch (err) {
    console.error('FATAL monitoring-lambda:', err.message, err.stack);
    if (isApiGateway) return json(500, { error: 'Internal Server Error', details: err.message }, cors);
    throw err;
  }
};
