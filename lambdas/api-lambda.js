const { Pool } = require("pg");
const {
    SNSClient,
    CreatePlatformEndpointCommand,
    DeleteEndpointCommand,
    SubscribeCommand,
    UnsubscribeCommand,
    GetEndpointAttributesCommand,
    SetEndpointAttributesCommand,
} = require("@aws-sdk/client-sns");

const snsClient = new SNSClient({});

// Centralized CORS configuration
const getCorsHeaders = (event) => {
    const origin = (event.headers || {}).origin || (event.headers || {}).Origin || '';
    const cloudfrontUrl = process.env.CLOUDFRONT_URL ? process.env.CLOUDFRONT_URL.replace(/\/$/, '') : '';
    const normalizedOrigin = origin.replace(/\/$/, '');
    const allowedOrigins = [cloudfrontUrl, 'http://localhost:3000'].filter(Boolean);

    if (origin && (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes(origin))) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
        };
    }
    return {};
};

const jsonResponse = (statusCode, body, headers = {}, corsHeaders = {}) => ({
    statusCode,
    headers: { ...corsHeaders, ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
});


// =============================================================
//  DATABASE
// =============================================================

let pool;
const initializePool = () => {
  if (!pool) {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
    if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
        throw new Error('Database connection environment variables are not fully set.');
    }
    pool = new Pool({
        connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
    });
  }
};

initializePool();

// =============================================================
//  API HANDLERS
// =============================================================

const handleProfile = async (client, method, body, user, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query(
            "SELECT id, full_name, email, app_role FROM public.users WHERE id = $1",
            [user.id]
        );
        if (rows.length === 0) {
            // Optionally create a profile if it doesn't exist
            const { rows: newRows } = await client.query(
                "INSERT INTO public.users (id, email, app_role) VALUES ($1, $2, $3) RETURNING id, full_name, email, app_role",
                [user.id, user.email, user.app_role || 'member']
            );
            return jsonResponse(200, newRows[0], {}, corsHeaders);
        }
        return jsonResponse(200, rows[0], {}, corsHeaders);
    }
    if (method === 'POST' || method === 'PUT') { // Allow both POST and PUT for flexibility
        const { full_name } = body;
        if (typeof full_name !== 'string' || full_name.trim().length < 2) {
            return jsonResponse(400, { error: 'Full name must be a string of at least 2 characters.' }, {}, corsHeaders);
        }
        const { rows } = await client.query(
            `UPDATE public.users SET full_name = $1 WHERE id = $2 RETURNING id, full_name, email, app_role`,
            [full_name, user.id]
        );
        if (rows.length === 0) {
            return jsonResponse(404, { error: 'User profile not found. Should have been created on GET.' }, {}, corsHeaders);
        }
        return jsonResponse(200, rows[0], {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /users/profile` }, {}, corsHeaders);
};


const handleUsers = async (client, method, path, body, user, corsHeaders) => {
    const pathParts = path.split('/').filter(Boolean);
    const userId = pathParts[1];

    if (method === 'GET' && !userId) {
        if (user.app_role !== 'admin') return jsonResponse(403, { error: 'Forbidden: Admin access required.' }, {}, corsHeaders);
        const { rows } = await client.query("SELECT id, full_name, email, app_role, created_at FROM public.users ORDER BY full_name");
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    
    if (method === 'GET' && userId) {
         const { rows } = await client.query("SELECT id, full_name, email, app_role, created_at FROM public.users WHERE id = $1", [userId]);
         return rows.length === 1 ? jsonResponse(200, rows[0], {}, corsHeaders) : jsonResponse(404, { error: 'User not found' }, {}, corsHeaders);
    }
    
    if (method === 'PUT' && userId) {
        if (user.app_role !== 'admin') return jsonResponse(403, { error: 'Forbidden: Admin access required.' }, {}, corsHeaders);
        const { full_name, app_role } = body;
        const { rows } = await client.query(
            "UPDATE public.users SET full_name = $1, app_role = $2 WHERE id = $3 RETURNING id, full_name, email, app_role",
            [full_name, app_role, userId]
        );
        return rows.length === 1 ? jsonResponse(200, rows[0], {}, corsHeaders) : jsonResponse(404, { error: 'User not found' }, {}, corsHeaders);
    }

    return jsonResponse(405, { error: `Method ${method} Not Allowed on /users` }, {}, corsHeaders);
};

const handleTeams = async (client, method, path, body, user, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query("SELECT id, name, created_by, created_at FROM public.teams");
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /teams` }, {}, corsHeaders);
};

const handleSites = async (client, method, path, body, corsHeaders) => {
    const pathParts = path.split('/').filter(Boolean);
    const siteId = pathParts[1];

    if (method === 'GET' && siteId) {
        // Fetch a single site with its ping logs
        const siteQuery = "SELECT * FROM public.monitored_sites WHERE id = $1";
        const pingsQuery = "SELECT * FROM public.ping_logs WHERE site_id = $1 ORDER BY checked_at DESC LIMIT 100";

        const siteResult = await client.query(siteQuery, [siteId]);
        if (siteResult.rows.length === 0) {
            return jsonResponse(404, { error: 'Site not found' }, {}, corsHeaders);
        }

        const pingsResult = await client.query(pingsQuery, [siteId]);
        const site = siteResult.rows[0];
        site.ping_logs = pingsResult.rows;

        return jsonResponse(200, site, {}, corsHeaders);
    }
    
    if (method === 'GET') {
        // Fetch all sites with their latest ping status
        const query = `
            SELECT
                s.id, s.name, s.url, s.country, s.latitude, s.longitude, s.is_paused, s.created_at, s.updated_at,
                lp.is_up,
                lp.response_time_ms,
                lp.checked_at as latest_ping_at
            FROM
                public.monitored_sites s
            LEFT JOIN LATERAL (
                SELECT is_up, response_time_ms, checked_at
                FROM public.ping_logs
                WHERE site_id = s.id
                ORDER BY checked_at DESC
                LIMIT 1
            ) lp ON true
            ORDER BY s.name;
        `;
        const { rows } = await client.query(query);
        const sites = rows.map(site => ({
            ...site,
            status: site.is_up === null ? 'unknown' : (site.is_up ? 'online' : 'offline'),
            latest_ping: site.latest_ping_at ? {
                is_up: site.is_up,
                response_time_ms: site.response_time_ms,
                checked_at: site.latest_ping_at
            } : null
        }));
        return jsonResponse(200, sites, {}, corsHeaders);
    }

    if (method === 'POST') {
        const { name, url, country, latitude, longitude } = body;
        if (!name || !url) return jsonResponse(400, {error: 'Name and URL are required'}, {}, corsHeaders);
        const { rows } = await client.query(
            "INSERT INTO public.monitored_sites (name, url, country, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, url, country, latitude, longitude]
        );
        return jsonResponse(201, rows[0], {}, corsHeaders);
    }
    if (method === 'DELETE') {
        if(!siteId) return jsonResponse(400, {error: 'Site ID is required'}, {}, corsHeaders);
        await client.query("DELETE FROM public.monitored_sites WHERE id = $1", [siteId]);
        return jsonResponse(204, {}, {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /sites` }, {}, corsHeaders);
};


const handleTopics = async (client, method, path, body, user, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query("SELECT t.id, t.name, t.description, CASE WHEN ts.id IS NOT NULL THEN true ELSE false END as is_subscribed FROM public.topics t LEFT JOIN public.topic_subscriptions ts ON t.id = ts.topic_id AND ts.user_id = $1 ORDER BY name", [user.id]);
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    if (method === 'POST') {
        const { name, description } = body;
        if (!name) return jsonResponse(400, { error: 'Topic name is required' }, {}, corsHeaders);
        const { rows } = await client.query(
            "INSERT INTO public.topics (name, description) VALUES ($1, $2) RETURNING *",
            [name, description || null]
        );
        return jsonResponse(201, rows[0], {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /topics` }, {}, corsHeaders);
};

const handleWebhooks = async (client, method, path, body, user, corsHeaders) => {
    const pathParts = path.split('/').filter(Boolean);
    const webhookId = pathParts[1];

    if (method === 'GET') {
        const { rows } = await client.query(
            'SELECT id, name, source_type, topic_id, description, created_at FROM public.webhook_sources ORDER BY created_at DESC'
        );
        return jsonResponse(200, rows, {}, corsHeaders);
    }

    if (method === 'POST') {
        const { name, source_type, topic_id, description } = body;
        if (!name || !source_type) return jsonResponse(400, { error: 'name and source_type are required' }, {}, corsHeaders);
        const { rows } = await client.query(
            `INSERT INTO public.webhook_sources (name, source_type, topic_id, description, user_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, source_type, topic_id || null, description || null, user.id]
        );
        return jsonResponse(201, rows[0], {}, corsHeaders);
    }

    if (method === 'DELETE' && webhookId) {
        const { rowCount } = await client.query(
            'DELETE FROM public.webhook_sources WHERE id = $1 RETURNING id',
            [webhookId]
        );
        if (rowCount === 0) return jsonResponse(404, { error: 'Webhook source not found' }, {}, corsHeaders);
        return jsonResponse(200, { success: true }, {}, corsHeaders);
    }

    return jsonResponse(405, { error: `Method ${method} Not Allowed on /webhooks` }, {}, corsHeaders);
};

const handleCalendar = async (client, method, path, body, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query("SELECT id, title, start_time, end_time, description, category FROM public.calendar_events ORDER BY start_time");
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    if (method === 'POST') {
        const { title, start_time, end_time, description, category } = body;
        if (!title || !start_time) return jsonResponse(400, { error: 'Title and start_time are required' }, {}, corsHeaders);
        const { rows } = await client.query(
            "INSERT INTO public.calendar_events (title, start_time, end_time, description, category) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [title, start_time, end_time, description, category]
        );
        return jsonResponse(201, rows[0], {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /calendar` }, {}, corsHeaders);
};

const handleAuditLogs = async (client, method, path, body, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query("SELECT a.id, a.action, a.target_resource, a.details, a.created_at, u.email FROM public.audit_logs a LEFT JOIN public.users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 200");
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /audit-logs` }, {}, corsHeaders);
};

const handleEmails = async (client, method, path, body, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query("SELECT id, recipient, subject, status, source, created_at FROM public.emails ORDER BY created_at DESC LIMIT 100");
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /emails` }, {}, corsHeaders);
};

const handlePushSubscriptions = async (client, method, body, user, corsHeaders, event) => {
    const { SNS_PLATFORM_APPLICATION_ARN, SNS_TOPIC_ARN } = process.env;

    if (!SNS_PLATFORM_APPLICATION_ARN || !SNS_TOPIC_ARN) {
        console.error('SNS environment variables are not set.');
        return jsonResponse(500, { error: 'Push notifications are not configured on the server.' }, {}, corsHeaders);
    }

    if (method === 'POST') {
        const { token } = body;
        if (!token) {
            return jsonResponse(400, { error: 'Device token is required.' }, {}, corsHeaders);
        }
        try {
            // 1. Create Platform Endpoint in SNS
            const createEndpointCmd = new CreatePlatformEndpointCommand({
                PlatformApplicationArn: SNS_PLATFORM_APPLICATION_ARN,
                Token: token,
                CustomUserData: `User-ID:${user.id}`,
            });
            const endpointRes = await snsClient.send(createEndpointCmd);
            const endpointArn = endpointRes.EndpointArn;

            if (!endpointArn) {
                throw new Error("Failed to create SNS platform endpoint.");
            }
            
            // 2. Ensure the endpoint is enabled
            const getAttrCmd = new GetEndpointAttributesCommand({ EndpointArn: endpointArn });
            const attrRes = await snsClient.send(getAttrCmd);
            if (attrRes.Attributes.Enabled !== 'true') {
                const setAttrCmd = new SetEndpointAttributesCommand({ EndpointArn: endpointArn, Attributes: { Enabled: 'true' } });
                await snsClient.send(setAttrCmd);
            }

            // 3. Create a subscription to the topic
            const subscribeCmd = new SubscribeCommand({
                TopicArn: SNS_TOPIC_ARN,
                Protocol: 'application',
                Endpoint: endpointArn,
            });
            const subscriptionRes = await snsClient.send(subscribeCmd);
            const subscriptionArn = subscriptionRes.SubscriptionArn;
            
            if (!subscriptionArn) {
                throw new Error("Failed to create SNS topic subscription.");
            }

            // 4. Store the subscription info in the database
            await client.query(
                `INSERT INTO public.push_subscriptions (user_id, token, endpoint_arn, subscription_arn) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (token) DO UPDATE SET user_id = $1, endpoint_arn = $3, subscription_arn = $4`,
                [user.id, token, endpointArn, subscriptionArn]
            );

            return jsonResponse(201, { success: true, endpointArn, subscriptionArn }, {}, corsHeaders);

        } catch (error) {
            console.error("Error creating push subscription:", error.message, error.stack);
            return jsonResponse(500, { error: 'Failed to create push subscription.', details: error.message }, {}, corsHeaders);
        }
    }

    if (method === 'DELETE') {
        const token = event.queryStringParameters?.token;
        if (!token) {
            return jsonResponse(400, { error: 'Device token is required in query string.' }, {}, corsHeaders);
        }
        try {
            // 1. Find the subscription in the database
            const { rows } = await client.query("SELECT endpoint_arn FROM public.push_subscriptions WHERE token = $1 AND user_id = $2", [token, user.id]);
            if (rows.length === 0) {
                return jsonResponse(404, { error: 'Subscription not found.' }, {}, corsHeaders);
            }
            const endpointArn = rows[0].endpoint_arn;

            // 2. Delete the Platform Endpoint from SNS (this also deletes associated subscriptions)
            const deleteEndpointCmd = new DeleteEndpointCommand({ EndpointArn: endpointArn });
            await snsClient.send(deleteEndpointCmd);

            // 3. Delete the record from our database
            await client.query("DELETE FROM public.push_subscriptions WHERE token = $1 AND user_id = $2", [token, user.id]);

            return jsonResponse(200, { success: true }, {}, corsHeaders);

        } catch (error) {
            console.error("Error deleting push subscription:", error.message, error.stack);
            // If the endpoint doesn't exist in SNS, it might have been deleted already. Still remove from our DB.
            if (error.name === 'InvalidParameterException' || error.name === 'NotFoundException') {
                 await client.query("DELETE FROM public.push_subscriptions WHERE token = $1 AND user_id = $2", [token, user.id]);
                 return jsonResponse(200, { success: true, message: 'Cleaned up stale subscription.' }, {}, corsHeaders);
            }
            return jsonResponse(500, { error: 'Failed to delete push subscription.', details: error.message }, {}, corsHeaders);
        }
    }

    return jsonResponse(405, { error: `Method ${method} Not Allowed on /push-subscriptions` }, {}, corsHeaders);
};


const handleMonitoring = async (client, method, event, corsHeaders) => {
    if (method !== 'GET') {
        return jsonResponse(405, { error: `Method ${method} Not Allowed on /monitoring` }, {}, corsHeaders);
    }
    const siteId = event.queryStringParameters?.siteId;
    if (!siteId) {
        return jsonResponse(400, { error: 'siteId query parameter is required' }, {}, corsHeaders);
    }
    const simulatedPath = `/sites/${siteId}`;
    return await handleSites(client, 'GET', simulatedPath, {}, corsHeaders);
};

// =============================================================
//  MAIN LAMBDA HANDLER
// =============================================================

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
  
  // For public endpoints that don't require auth, handle them here.
  if (event.path === '/synthetic-ping' && event.httpMethod === 'GET') {
      return jsonResponse(200, { message: 'Ping successful' }, {}, corsHeaders);
  }

  // All subsequent endpoints require authentication.
  const claims = event.requestContext.authorizer?.claims;
  if (!claims) {
      return jsonResponse(401, { error: 'Unauthorized: No claims found in request. This is an authorizer configuration issue.' }, {}, corsHeaders);
  }

  const user = {
      id: claims.sub,
      email: claims.email,
      app_role: claims['custom:app_role'] || 'member' // Default role if not present
  };

  let client;
  try {
    client = await pool.connect();

    // Ensure user exists in our DB upon first authenticated request
    await client.query(
        `INSERT INTO public.users (id, email, app_role) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email, user.app_role]
    );

    const method = event.httpMethod;
    const path = event.path;
    const body = event.body ? JSON.parse(event.body) : {};

    if (path.startsWith('/users/profile'))   return await handleProfile(client, method, body, user, corsHeaders);
    if (path.startsWith('/users'))             return await handleUsers(client, method, path, body, user, corsHeaders);
    if (path.startsWith('/teams'))             return await handleTeams(client, method, path, body, user, corsHeaders);
    if (path.startsWith('/sites'))             return await handleSites(client, method, path, body, corsHeaders);
    if (path.startsWith('/monitoring'))        return await handleMonitoring(client, method, event, corsHeaders);
    if (path.startsWith('/topics'))            return await handleTopics(client, method, path, body, user, corsHeaders);
    if (path.startsWith('/webhooks'))          return await handleWebhooks(client, method, path, body, user, corsHeaders);
    if (path.startsWith('/calendar'))          return await handleCalendar(client, method, path, body, corsHeaders);
    if (path.startsWith('/audit-logs'))        return await handleAuditLogs(client, method, path, body, corsHeaders);
    if (path.startsWith('/emails'))            return await handleEmails(client, method, path, body, corsHeaders);
    if (path.startsWith('/push-subscriptions')) return await handlePushSubscriptions(client, method, body, user, corsHeaders, event);

    return jsonResponse(404, { error: 'Not Found' }, {}, corsHeaders);

  } catch (err) {
    console.error('FATAL: Unhandled error in Lambda handler:', err.message, err.stack);
    return jsonResponse(500, {
      error: 'Internal Server Error',
      details: err.message,
    }, {}, corsHeaders);
  } finally {
    if (client) client.release();
  }
};
