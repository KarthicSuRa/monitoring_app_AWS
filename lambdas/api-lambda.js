/**
 * api-lambda.js  (DynamoDB rewrite)
 * Handles: /users, /teams, /sites, /topics, /webhooks,
 *          /calendar, /audit-logs, /emails, /push-subscriptions, /monitoring
 */
const {
  SNSClient,
  CreatePlatformEndpointCommand,
  DeleteEndpointCommand,
  SubscribeCommand,
  GetEndpointAttributesCommand,
  SetEndpointAttributesCommand,
} = require('@aws-sdk/client-sns');

const {
  TABLES, now, newId,
  getItem, putItem, updateItem, deleteItem,
  queryItems, scanItems,
  ttlDays,
} = require('./dynamo-client');

const snsClient = new SNSClient({});

// ─── CORS ─────────────────────────────────────────────────────────────────

const getCorsHeaders = (event) => {
  const origin = (event.headers || {}).origin || (event.headers || {}).Origin || '';
  const cloudfrontUrl = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
  const allowed = [cloudfrontUrl, 'http://localhost:3000'].filter(Boolean);
  if (origin && allowed.includes(origin.replace(/\/$/, ''))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    };
  }
  return {};
};

const json = (status, body, cors = {}) => ({
  statusCode: status,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {}),
});

// ─── USERS ────────────────────────────────────────────────────────────────

async function handleProfile(method, body, user, cors) {
  if (method === 'GET') {
    let item = await getItem(TABLES.USERS, { id: user.id });
    if (!item) {
      item = { id: user.id, email: user.email, app_role: user.app_role || 'member', created_at: now(), updated_at: now() };
      await putItem(TABLES.USERS, item);
    }
    return json(200, item, cors);
  }
  if (method === 'POST' || method === 'PUT') {
    const { full_name } = body;
    if (!full_name || full_name.trim().length < 2)
      return json(400, { error: 'full_name must be at least 2 characters.' }, cors);
    const updated = await updateItem(TABLES.USERS, { id: user.id }, { full_name: full_name.trim(), updated_at: now() });
    return json(200, updated, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

async function handleUsers(method, pathParts, body, user, cors) {
  const userId = pathParts[1];

  if (method === 'GET' && !userId) {
    if (user.app_role !== 'admin') return json(403, { error: 'Forbidden' }, cors);
    const items = await scanItems(TABLES.USERS);
    return json(200, items, cors);
  }
  if (method === 'GET' && userId) {
    const item = await getItem(TABLES.USERS, { id: userId });
    return item ? json(200, item, cors) : json(404, { error: 'User not found' }, cors);
  }
  if (method === 'PUT' && userId) {
    if (user.app_role !== 'admin') return json(403, { error: 'Forbidden' }, cors);
    const { full_name, app_role } = body;
    const updated = await updateItem(TABLES.USERS, { id: userId }, { full_name, app_role, updated_at: now() });
    return json(200, updated, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── TEAMS ────────────────────────────────────────────────────────────────

async function handleTeams(method, body, user, cors) {
  if (method === 'GET') {
    const items = await scanItems(TABLES.TEAMS);
    return json(200, items, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── SITES ────────────────────────────────────────────────────────────────

async function handleSites(method, pathParts, body, cors) {
  const siteId = pathParts[1];

  if (method === 'GET' && siteId) {
    const site = await getItem(TABLES.MONITORED_SITES, { id: siteId });
    if (!site) return json(404, { error: 'Site not found' }, cors);

    // Fetch latest 100 ping logs (SK sorted: most recent last, so we reverse)
    const pings = await queryItems(TABLES.PING_LOGS, {
      KeyConditionExpression: 'site_id = :sid',
      ExpressionAttributeValues: { ':sid': siteId },
      ScanIndexForward: false,
      Limit: 100,
    });
    site.ping_logs = pings;
    return json(200, site, cors);
  }

  if (method === 'GET') {
    const sites = await scanItems(TABLES.MONITORED_SITES);
    // status, last_checked_at, last_response_time_ms are written by monitoring-lambda
    // after each check run — no need to query ping logs on every list request.
    const enriched = sites.map(s => ({
      ...s,
      // normalise status to 3 possible values
      status: s.status === 'online' ? 'online' : s.status === 'offline' ? 'offline' : 'unknown',
      latest_ping: s.last_checked_at ? {
        is_up: s.status === 'online',
        response_time_ms: s.last_response_time_ms ?? null,
        checked_at: s.last_checked_at,          // clean ISO string
        checked_at_iso: s.last_checked_at,
        status_code: s.last_status_code ?? null,
      } : null,
    }));
    enriched.sort((a, b) => a.name.localeCompare(b.name));
    return json(200, enriched, cors);
  }

  if (method === 'POST') {
    const { name, url, country, latitude, longitude } = body;
    if (!name || !url) return json(400, { error: 'name and url are required' }, cors);
    const ts = now();
    const item = { id: newId(), name, url, country, latitude, longitude, is_paused: false, status: 'active', created_at: ts, updated_at: ts };
    await putItem(TABLES.MONITORED_SITES, item);
    return json(201, item, cors);
  }

  if (method === 'DELETE' && siteId) {
    await deleteItem(TABLES.MONITORED_SITES, { id: siteId });
    return json(204, {}, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── TOPICS ───────────────────────────────────────────────────────────────

async function handleTopics(method, body, user, cors) {
  if (method === 'GET') {
    const allTopics = await scanItems(TABLES.TOPICS);
    // Check subscription status for this user
    const subs = await queryItems(TABLES.TOPIC_SUBSCRIPTIONS, {
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': user.id },
    });
    const subscribedIds = new Set(subs.map(s => s.topic_id));
    const enriched = allTopics.map(t => ({ ...t, is_subscribed: subscribedIds.has(t.id) }));
    enriched.sort((a, b) => a.name.localeCompare(b.name));
    return json(200, enriched, cors);
  }
  if (method === 'POST') {
    const { name, description } = body;
    if (!name) return json(400, { error: 'Topic name is required' }, cors);
    const ts = now();
    const item = { id: newId(), name, description: description || null, created_at: ts, updated_at: ts };
    await putItem(TABLES.TOPICS, item);
    return json(201, item, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── WEBHOOKS ─────────────────────────────────────────────────────────────

async function handleWebhooks(method, pathParts, body, user, cors) {
  const webhookId = pathParts[1];
  if (method === 'GET') {
    const items = await scanItems(TABLES.WEBHOOK_SOURCES);
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return json(200, items, cors);
  }
  if (method === 'POST') {
    const { name, source_type, topic_id } = body;
    if (!name || !source_type) return json(400, { error: 'name and source_type are required' }, cors);
    const ts = now();
    const item = { id: newId(), name, source_type, topic_id: topic_id || null, created_at: ts, updated_at: ts };
    await putItem(TABLES.WEBHOOK_SOURCES, item);
    return json(201, item, cors);
  }
  if (method === 'DELETE' && webhookId) {
    await deleteItem(TABLES.WEBHOOK_SOURCES, { id: webhookId });
    return json(200, { success: true }, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────

async function handleCalendar(method, body, cors) {
  if (method === 'GET') {
    const items = await scanItems(TABLES.CALENDAR_EVENTS);
    items.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return json(200, items, cors);
  }
  if (method === 'POST') {
    const { title, start_time, end_time, description, category } = body;
    if (!title || !start_time) return json(400, { error: 'title and start_time are required' }, cors);
    const ts = now();
    const yearMonth = start_time.slice(0, 7); // "2026-04"
    const item = { id: newId(), title, start_time, end_time, description, category, year_month: yearMonth, created_at: ts, updated_at: ts };
    await putItem(TABLES.CALENDAR_EVENTS, item);
    return json(201, item, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────

async function handleAuditLogs(method, cors) {
  if (method === 'GET') {
    const items = await queryItems(TABLES.AUDIT_LOGS, {
      IndexName: 'all-created-index',
      KeyConditionExpression: 'log_type = :lt',
      ExpressionAttributeValues: { ':lt': 'AUDIT' },
      ScanIndexForward: false,
      Limit: 200,
    });
    return json(200, items, cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── EMAILS ───────────────────────────────────────────────────────────────

async function handleEmails(method, cors) {
  if (method === 'GET') {
    const items = await scanItems(TABLES.EMAILS);
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return json(200, items.slice(0, 100), cors);
  }
  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────

async function handlePushSubscriptions(method, body, user, event, cors) {
  const { SNS_PLATFORM_APPLICATION_ARN, SNS_TOPIC_ARN } = process.env;
  if (!SNS_PLATFORM_APPLICATION_ARN || !SNS_TOPIC_ARN)
    return json(500, { error: 'Push notifications not configured.' }, cors);

  if (method === 'POST') {
    const { token } = body;
    if (!token) return json(400, { error: 'Device token is required.' }, cors);

    try {
      const endpointRes = await snsClient.send(new CreatePlatformEndpointCommand({
        PlatformApplicationArn: SNS_PLATFORM_APPLICATION_ARN,
        Token: token,
        CustomUserData: `User-ID:${user.id}`,
      }));
      const endpointArn = endpointRes.EndpointArn;

      // Ensure endpoint is enabled
      const attrRes = await snsClient.send(new GetEndpointAttributesCommand({ EndpointArn: endpointArn }));
      if (attrRes.Attributes.Enabled !== 'true') {
        await snsClient.send(new SetEndpointAttributesCommand({
          EndpointArn: endpointArn,
          Attributes: { Enabled: 'true' },
        }));
      }

      const subRes = await snsClient.send(new SubscribeCommand({
        TopicArn: SNS_TOPIC_ARN,
        Protocol: 'application',
        Endpoint: endpointArn,
      }));
      const subscriptionArn = subRes.SubscriptionArn;

      const ts = now();
      await putItem(TABLES.PUSH_SUBSCRIPTIONS, {
        user_id: user.id,
        token,
        endpoint_arn: endpointArn,
        subscription_arn: subscriptionArn,
        created_at: ts,
      });

      return json(201, { success: true, endpointArn, subscriptionArn }, cors);
    } catch (err) {
      console.error('Push subscribe error:', err.message);
      return json(500, { error: 'Failed to create push subscription.', details: err.message }, cors);
    }
  }

  if (method === 'DELETE') {
    const token = event.queryStringParameters?.token;
    if (!token) return json(400, { error: 'token query param required.' }, cors);
    try {
      const subs = await queryItems(TABLES.PUSH_SUBSCRIPTIONS, {
        IndexName: 'token-index',
        KeyConditionExpression: '#t = :tok',
        ExpressionAttributeNames: { '#t': 'token' },
        ExpressionAttributeValues: { ':tok': token },
        Limit: 1,
      });
      if (subs.length === 0) return json(404, { error: 'Subscription not found.' }, cors);
      const sub = subs[0];
      if (sub.user_id !== user.id) return json(403, { error: 'Forbidden' }, cors);

      try {
        await snsClient.send(new DeleteEndpointCommand({ EndpointArn: sub.endpoint_arn }));
      } catch (snsErr) {
        if (!['InvalidParameterException', 'NotFoundException'].includes(snsErr.name)) throw snsErr;
      }
      await deleteItem(TABLES.PUSH_SUBSCRIPTIONS, { user_id: user.id, token });
      return json(200, { success: true }, cors);
    } catch (err) {
      console.error('Push delete error:', err.message);
      return json(500, { error: 'Failed to delete subscription.', details: err.message }, cors);
    }
  }

  return json(405, { error: 'Method not allowed' }, cors);
}

// ─── MONITORING (proxy to sites with ping logs) ───────────────────────────

async function handleMonitoring(method, event, cors) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, cors);
  const siteId = event.queryStringParameters?.siteId;
  if (!siteId) return json(400, { error: 'siteId query param required' }, cors);
  return handleSites('GET', ['sites', siteId], {}, cors);
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const cors = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: cors, body: '' };

  const reqOrigin = (event.headers || {}).origin || '';
  if (reqOrigin && !cors['Access-Control-Allow-Origin'])
    return json(403, { error: 'CORS: Origin not allowed' });

  if (event.path === '/synthetic-ping' && event.httpMethod === 'GET')
    return json(200, { message: 'Ping successful' }, cors);

  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) return json(401, { error: 'Unauthorized' }, cors);

  const user = {
    id: claims.sub,
    email: claims.email,
    app_role: claims['custom:app_role'] || 'member',
  };

  // Upsert user on every authenticated request
  const existing = await getItem(TABLES.USERS, { id: user.id });
  if (!existing) {
    await putItem(TABLES.USERS, {
      id: user.id,
      email: user.email,
      app_role: user.app_role,
      created_at: now(),
      updated_at: now(),
    });
  }

  const method = event.httpMethod;
  const path = event.path.replace(/^\/prod/, '');
  const pathParts = path.split('/').filter(Boolean);
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    const base = pathParts[0];

    if (base === 'users' && pathParts[1] === 'profile') return await handleProfile(method, body, user, cors);
    if (base === 'users')             return await handleUsers(method, pathParts, body, user, cors);
    if (base === 'teams')             return await handleTeams(method, body, user, cors);
    if (base === 'sites')             return await handleSites(method, pathParts, body, cors);
    if (base === 'monitoring')        return await handleMonitoring(method, event, cors);
    if (base === 'topics')            return await handleTopics(method, body, user, cors);
    if (base === 'webhooks')          return await handleWebhooks(method, pathParts, body, user, cors);
    if (base === 'calendar')          return await handleCalendar(method, body, cors);
    if (base === 'audit-logs')        return await handleAuditLogs(method, cors);
    if (base === 'emails')            return await handleEmails(method, cors);
    if (base === 'push-subscriptions') return await handlePushSubscriptions(method, body, user, event, cors);

    return json(404, { error: 'Not Found' }, cors);
  } catch (err) {
    console.error('FATAL api-lambda:', err.message, err.stack);
    return json(500, { error: 'Internal Server Error', details: err.message }, cors);
  }
};
