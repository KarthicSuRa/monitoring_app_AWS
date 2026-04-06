/**
 * ssl-check-lambda.js
 *
 * Checks SSL/TLS certificate expiry for all active MCM sites.
 * Triggered daily by EventBridge. Writes results to DynamoDB.
 * Fires alerts via notification-lambda at thresholds:
 *   <= 30 days → medium alert
 *   <= 14 days → high alert
 *   <=  7 days → critical
 *   <=  1 day  → critical (emergency)
 *   Invalid/expired → critical
 *
 * Uses Node.js built-in `tls` module — zero extra npm dependencies.
 */
'use strict';

const tls  = require('tls');
const { TABLES, now, ttlDays, scanItems, putItem } = require('./dynamo-client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

// Alias for clarity — uses the existing mcm-ssl-certificates table
const SSL_TABLE = TABLES.SSL_CERTIFICATES;

// ─── TLS Certificate Check ────────────────────────────────────────────────

/**
 * Perform a TLS handshake to `hostname` (port 443) and return cert details.
 * @returns {{ valid: boolean, daysRemaining: number|null, issuer: string, subject: string, validTo: string|null, error: string|null }}
 */
function checkCert(hostname) {
  return new Promise((resolve) => {
    const timeout = 10_000; // 10 s

    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || !cert.valid_to) {
            return resolve({ valid: false, daysRemaining: null, issuer: '', subject: '', validTo: null, error: 'No certificate returned' });
          }

          const validTo = new Date(cert.valid_to);
          const now_     = Date.now();
          const daysRemaining = Math.floor((validTo.getTime() - now_) / (1000 * 60 * 60 * 24));
          const issuer  = cert.issuer?.O || cert.issuer?.CN || 'Unknown';
          const subject = cert.subject?.CN || hostname;

          resolve({
            valid: daysRemaining >= 0,
            daysRemaining,
            issuer,
            subject,
            validTo: validTo.toISOString(),
            error: daysRemaining < 0 ? 'Certificate has expired' : null,
          });
        } catch (e) {
          socket.destroy();
          resolve({ valid: false, daysRemaining: null, issuer: '', subject: '', validTo: null, error: e.message });
        }
      }
    );

    socket.setTimeout(timeout, () => {
      socket.destroy();
      resolve({ valid: false, daysRemaining: null, issuer: '', subject: '', validTo: null, error: 'Connection timed out' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ valid: false, daysRemaining: null, issuer: '', subject: '', validTo: null, error: err.message });
    });
  });
}

// ─── Alert Severity Mapping ───────────────────────────────────────────────

function getSeverity(daysRemaining) {
  if (daysRemaining === null || daysRemaining < 0) return 'critical';
  if (daysRemaining <= 1)  return 'critical';
  if (daysRemaining <= 7)  return 'critical';
  if (daysRemaining <= 14) return 'high';
  if (daysRemaining <= 30) return 'medium';
  return null; // no alert needed
}

// ─── Fire Notification (via notification-lambda invoke) ───────────────────

async function fireAlert(site, daysRemaining, validTo, error) {
  const severity = getSeverity(daysRemaining);
  if (!severity) return; // no alert needed — cert is healthy

  let title, message;
  if (daysRemaining === null || daysRemaining < 0) {
    title   = `🔒 SSL Expired: ${site.name}`;
    message = `The SSL certificate for "${site.name}" (${site.url}) has EXPIRED. ${error || ''}`;
  } else {
    title   = `🔐 SSL Expiring Soon: ${site.name}`;
    message = `The SSL certificate for "${site.name}" expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${validTo ? new Date(validTo).toLocaleDateString() : 'unknown'}). Renew immediately.`;
  }

  const payload = {
    httpMethod: 'POST',
    path: '/notifications',
    headers: {
      'Content-Type': 'application/json',
      origin: process.env.CLOUDFRONT_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      title,
      message,
      severity,
      type: 'ssl_alert',
      topic_name: 'SSL Monitoring',
      metadata: {
        site_id: site.id,
        site_name: site.name,
        days_remaining: daysRemaining,
        valid_to: validTo,
      },
    }),
    requestContext: {},
  };

  try {
    await lambdaClient.send(new InvokeCommand({
      FunctionName: process.env.NOTIFICATION_LAMBDA_NAME,
      InvocationType: 'Event', // async — fire and forget
      Payload: Buffer.from(JSON.stringify(payload)),
    }));
    console.log(`SSL alert fired for ${site.name} (${daysRemaining} days remaining)`);
  } catch (err) {
    console.error(`Failed to fire SSL alert for ${site.name}:`, err.message);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function runSslChecks() {
  const sites = await scanItems(TABLES.MONITORED_SITES);
  const activeSites = sites.filter(s => !s.is_paused && s.url?.startsWith('https'));

  console.log(`Running SSL checks for ${activeSites.length} HTTPS sites...`);

  const ts = now();
  const expire90d = ttlDays(90);
  const results = [];

  // Run checks sequentially to avoid overwhelming small Lambda memory
  // (TLS sockets use file descriptors — batch of ~10 is safe)
  const BATCH = 10;
  for (let i = 0; i < activeSites.length; i += BATCH) {
    const batch = activeSites.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(async (site) => {
      let hostname;
      try { hostname = new URL(site.url).hostname; } catch { hostname = site.url; }

      console.log(`Checking SSL: ${hostname}`);
      const certInfo = await checkCert(hostname);

      // Persist to DynamoDB
      await putItem(TABLES.SSL_CHECKS, {
        site_id:         site.id,
        checked_at:      ts,
        hostname,
        is_valid:        certInfo.valid,
        days_remaining:  certInfo.daysRemaining,
        valid_to:        certInfo.validTo,
        issuer:          certInfo.issuer,
        subject:         certInfo.subject,
        error_message:   certInfo.error || null,
        ttl:             expire90d,
      });

      return { site, hostname, ...certInfo };
    }));
    results.push(...batchResults);
  }

  // Fire alerts (deduplication is handled inside notification-lambda)
  await Promise.all(results.map(r =>
    fireAlert(r.site, r.daysRemaining, r.validTo, r.error)
  ));

  const expired  = results.filter(r => !r.valid);
  const expiring = results.filter(r => r.valid && r.daysRemaining !== null && r.daysRemaining <= 30);
  const healthy  = results.filter(r => r.valid && (r.daysRemaining === null || r.daysRemaining > 30));

  console.log(`SSL Check done — Healthy: ${healthy.length}, Expiring Soon: ${expiring.length}, Expired/Invalid: ${expired.length}`);

  return {
    checked:  results.length,
    healthy:  healthy.length,
    expiring: expiring.length,
    expired:  expired.length,
    details:  results.map(r => ({
      site:          r.site.name,
      hostname:      r.hostname,
      valid:         r.valid,
      daysRemaining: r.daysRemaining,
      validTo:       r.validTo,
      issuer:        r.issuer,
      error:         r.error,
    })),
  };
}

exports.handler = async (event) => {
  // Support both scheduled (EventBridge) and manual API invocation
  const isApiGateway = !!event?.requestContext?.apiId;

  if (event?.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }

  try {
    const result = await runSslChecks();
    if (isApiGateway) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(result),
      };
    }
    console.log('SSL check complete:', JSON.stringify({ checked: result.checked, expiring: result.expiring, expired: result.expired }));
  } catch (err) {
    console.error('FATAL ssl-check-lambda:', err.message, err.stack);
    if (isApiGateway) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'SSL check failed', details: err.message }),
      };
    }
    throw err;
  }
};
