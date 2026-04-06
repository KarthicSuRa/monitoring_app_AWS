// lambdas/monitoring-lambda.js

const { Pool } = require('pg');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

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
    return {};
};

const jsonResponse = (statusCode, body, corsHeaders = {}) => ({
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
});

let pool;

const initializePool = () => {
  if (pool) return;
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      throw new Error('Database connection environment variables are not fully set.');
  }
  pool = new Pool({
      connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
  });
};

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

const fireDownAlert = async (client, site, errorMessage) => {
    const recent = await client.query(
    `SELECT id FROM public.notifications
     WHERE type = 'site_alert'
       AND metadata->>'site_name' = $1
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
    topic_name: 'Site Monitoring',
    metadata: {
        site_name: site.name,
        site_id: site.id,
        region: site.country
    }
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

    if (result.FunctionError || (responsePayload && responsePayload.statusCode >= 400)) {
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
        `SELECT id, url, name, country FROM public.monitored_sites WHERE is_paused = false`
    );

    console.log(`🔍 Checking ${sites.length} active sites...`);

    const results = await Promise.all(
        sites.map(async (site) => {
            try {
                const invokeResult = await lambdaClient.send(
                    new InvokeCommand({
                        FunctionName: process.env.CHECKER_LAMBDA_NAME,
                        InvocationType: 'RequestResponse',
                        Payload: JSON.stringify({ url: site.url }),
                    })
                );

                const payload = JSON.parse(Buffer.from(invokeResult.Payload).toString());

                if (invokeResult.FunctionError || (payload && payload.statusCode >= 400)) {
                    const errorMessage = payload.body ? JSON.parse(payload.body).error : 'Checker lambda failed';
                    console.error(`Error in checker lambda for ${site.name}: ${errorMessage}`);
                    return { site, is_up: false, response_time_ms: 0, status_code: 0, status_text: 'Lambda Error', error_message: errorMessage };
                }
                
                return { site, ...payload };

            } catch (e) {
                console.error(`Failed to invoke checker lambda for site ${site.name}:`, e.message);
                return { site, is_up: false, response_time_ms: 0, status_code: 0, status_text: 'Invocation Error', error_message: e.message };
            }
        })
    );

    if (results.length > 0) {
        const insertQuery = `
            INSERT INTO public.ping_logs (site_id, is_up, response_time_ms, status_code, status_text, error_message)
            VALUES ${results.map((_, i) =>
                `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
            ).join(',')}\n        `;
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


exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const isApiGatewayEvent = event.requestContext && event.requestContext.apiId;
  
  if (isApiGatewayEvent) {
      const requestOrigin = (event.headers || {}).origin || '';
      if (requestOrigin && !corsHeaders['Access-Control-Allow-Origin']) {
          return jsonResponse(403, { error: 'CORS error: Origin not allowed' }, {});
      }
  }

  let client;
  try {
    initializePool();
    client = await pool.connect();

    const checkResult = await runMonitoringCheck(client);

    if (isApiGatewayEvent) {
      return jsonResponse(200, checkResult, corsHeaders);
    } else {
      console.log('Scheduled monitoring check completed successfully.');
    }

  } catch (err) {
    console.error('[FATAL] Unhandled error in Lambda handler:', err.message, err.stack);
    
    if (isApiGatewayEvent) {
        return jsonResponse(500, {
            error: 'Internal Server Error',
            details: err.message,
        }, corsHeaders);
    } else {
        throw err;
    }
  } finally {
    if (client) {
        client.release();
    }
  }
};
