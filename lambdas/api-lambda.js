const { Pool } = require("pg");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Centralized CORS configuration
const getCorsHeaders = (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  // Allow localhost for development and the CloudFront URL for production
  const allowedOrigins = [process.env.CLOUDFRONT_URL, 'http://localhost:3000', 'https://localhost:3000'];

  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }
  return {}; // Return empty object if origin is not allowed
};

const jsonResponse = (statusCode, body, headers = {}, corsHeaders = {}) => ({
    statusCode,
    headers: { ...corsHeaders, ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
});


// =============================================================
//  DATABASE & AUTH
// =============================================================

let pool;
const initializePool = () => {
  if (!pool) {
    console.log("Initializing database connection pool...");
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
    if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
        console.error("FATAL: DB env vars not set.");
        throw new Error("Database connection environment variables are not fully set.");
    }
    pool = new Pool({
        connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
    });
    console.log("Database pool created.");
  }
};

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

const authenticate = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return { authenticated: false, error: "Missing Authorization header" };
  const token = authHeader.split(" ")[1];
  if (!token) return { authenticated: false, error: "Invalid token format" };

  try {
    const payload = await verifier.verify(token);
    return { authenticated: true, user: { id: payload.sub, email: payload.email, app_role: payload['custom:app_role'] || 'member' } };
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return { authenticated: false, error: "Invalid token" };
  }
};

// =============================================================
//  API HANDLERS
// =============================================================

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

const handleNotifications = async (client, method, path, body, user, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query("SELECT id, topic_id, title, message, severity, status, type, metadata, created_at FROM public.notifications ORDER BY created_at DESC LIMIT 100");
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    return jsonResponse(405, { error: `Method ${method} Not Allowed on /notifications` }, {}, corsHeaders);
};

const handleWebhooks = async (client, method, path, body, corsHeaders) => {
    if (method === 'GET') {
        const { rows } = await client.query("SELECT id, name, source_type, topic_id, created_at FROM public.webhook_sources ORDER BY created_at DESC");
        return jsonResponse(200, rows, {}, corsHeaders);
    }
    if (method === 'POST') {
        const { name, source_type, topic_id } = body;
        if (!name || !source_type) return jsonResponse(400, { error: 'Name and source_type are required' }, {}, corsHeaders);
        const { rows } = await client.query(
            "INSERT INTO public.webhook_sources (name, source_type, topic_id) VALUES ($1, $2, $3) RETURNING *",
            [name, source_type, topic_id]
        );
        return jsonResponse(201, rows[0], {}, corsHeaders);
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

const handleMonitoring = async (client, method, event, corsHeaders) => {
    if (method !== 'GET') {
        return jsonResponse(405, { error: `Method ${method} Not Allowed on /monitoring` }, {}, corsHeaders);
    }
    const siteId = event.queryStringParameters?.siteId;
    if (!siteId) {
        return jsonResponse(400, { error: 'siteId query parameter is required' }, {}, corsHeaders);
    }
    // Re-use the logic from handleSites by simulating the path
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

  // Temporary check to allow synthetic monitoring pings
  if (event.path === '/synthetic-ping' && event.httpMethod === 'GET') {
      return jsonResponse(200, { message: 'Ping successful' }, {}, corsHeaders);
  }


  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return jsonResponse(403, { error: "CORS error: Origin not allowed" }, {}, corsHeaders);
  }

  const authResult = await authenticate(event);
  if (!authResult.authenticated) {
    return jsonResponse(401, { error: authResult.error }, {}, corsHeaders);
  }

  const { user } = authResult;
  let client;

  try {
    initializePool();
    client = await pool.connect();
    
    const method = event.httpMethod;
    const path = event.path;
    const body = event.body ? JSON.parse(event.body) : {};

    if (path.startsWith("/users")) return await handleUsers(client, method, path, body, user, corsHeaders);
    if (path.startsWith("/teams")) return await handleTeams(client, method, path, body, user, corsHeaders);
    if (path.startsWith("/sites")) return await handleSites(client, method, path, body, corsHeaders);
    if (path.startsWith("/monitoring")) return await handleMonitoring(client, method, event, corsHeaders);
    if (path.startsWith("/topics")) return await handleTopics(client, method, path, body, user, corsHeaders);
    if (path.startsWith("/notifications")) return await handleNotifications(client, method, path, body, user, corsHeaders);
    if (path.startsWith("/webhooks")) return await handleWebhooks(client, method, path, body, corsHeaders);
    if (path.startsWith("/calendar")) return await handleCalendar(client, method, path, body, corsHeaders);
    if (path.startsWith("/audit-logs")) return await handleAuditLogs(client, method, path, body, corsHeaders);
    if (path.startsWith("/emails")) return await handleEmails(client, method, path, body, corsHeaders);

    return jsonResponse(404, { error: "Not Found" }, {}, corsHeaders);

  } catch (err) {
    console.error("FATAL_ERROR in Lambda handler:", err);
    // Sanitize error message for production
    const errorMessage = process.env.NODE_ENV === 'production' ? "Internal Server Error" : err.message;
    return jsonResponse(500, { error: "Internal Server Error", details: errorMessage }, {}, corsHeaders);
  } finally {
    if (client) client.release();
  }
};
