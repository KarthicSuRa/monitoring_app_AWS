const { Pool } = require("pg");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const https = require('https');

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
//  DATABASE & AUTH
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

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

const authenticate = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header' };
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return { authenticated: false, error: 'Invalid token format' };
  }
  try {
    const payload = await verifier.verify(token);
    return { authenticated: true, user: { id: payload.sub, email: payload.email, app_role: payload['custom:app_role'] || 'member' } };
  } catch (error) {
    return { authenticated: false, error: 'Invalid token' };
  }
};

// =============================================================
//  OneSignal Push Notification Sender
// =============================================================
const sendOneSignalPush = async (client, notification) => {
    const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
    const oneSignalApiKey = "os_v2_app_5xlztdfarndo3pchwcxabxmqkddjab4s4dwuuif7xwn5dx5olas26fhhrwajus6x2jugw6jvndoaxbyhvbca73aahy4amrsiqrbbula";

    if (!oneSignalAppId || !oneSignalApiKey) {
        console.warn('OneSignal environment variables not set. Skipping push notification.');
        return null;
    }

    let oneSignalTarget = {
        included_segments: ["All"] // Default to broad audience
    };

    // If it's a topic-specific notification, find subscribed users
    if (notification.topic_id) {
        try {
            const { rows: subscribers } = await client.query(
                'SELECT user_id FROM public.topic_subscribers WHERE topic_id = $1',
                [notification.topic_id]
            );
            const subscriberIds = subscribers.map(s => s.user_id);
            if (subscriberIds.length > 0) {
                oneSignalTarget = { include_external_user_ids: subscriberIds };
            } else {
                console.log(`Topic ${notification.topic_id} has no subscribers. Skipping push.`);
                return null; // No one to send it to
            }
        } catch (subErr) {
            console.error(`Failed to get subscribers for topic ${notification.topic_id}:`, subErr.message);
            return null; // Error, so don't send
        }
    }

    const pushPayload = JSON.stringify({
        app_id: oneSignalAppId,
        ...oneSignalTarget,
        headings: { en: notification.title },
        contents: { en: notification.message },
        data: {
            notificationId: notification.id,
            severity: notification.severity,
            type: notification.type,
            topic_id: notification.topic_id,
            status: notification.status,
        },
    });

    const pushOptions = {
        hostname: 'onesignal.com',
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${oneSignalApiKey}`,
            'Content-Length': Buffer.byteLength(pushPayload),
        },
    };

    return new Promise((resolve) => {
        const req = https.request(pushOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(data); }
            });
        });
        req.on('error', (e) => {
            console.error('OneSignal push request failed:', e.message);
            resolve({ error: e.message });
        });
        req.write(pushPayload);
        req.end();
    });
};


// =============================================================
//  NOTIFICATION HANDLER
// =============================================================

const handleNotifications = async (client, method, path, body, user, corsHeaders) => {
    const pathParts = path.split('/').filter(p => p && p !== 'prod'); // e.g. ["notifications", "abc-123", "comments"]
    const notificationId = pathParts[1];
    const isTest = pathParts[1] === 'test';
    const isComments = pathParts[2] === 'comments';
    const isGenericPost = method === 'POST' && pathParts.length === 1 && pathParts[0] === 'notifications';

    // POST /notifications (generic, public)
    if (isGenericPost) {
        const { topic_id, topic_name, title, message, severity, type, metadata } = body;
        if (!title || !message || !severity) {
            return jsonResponse(400, { error: 'Missing required fields: title, message, severity' }, {}, corsHeaders);
        }

        let finalTopicId = topic_id || null;

        if (topic_name && !finalTopicId) {
            try {
                const topicRes = await client.query(
                    "SELECT id FROM public.topics WHERE name = $1 LIMIT 1",
                    [topic_name]
                );
                if (topicRes.rows.length > 0) {
                    finalTopicId = topicRes.rows[0].id;
                } else {
                    console.warn(`Topic with name '${topic_name}' not found. Creating notification without a topic.`);
                }
            } catch (topicErr) {
                console.error('Error looking up topic by name:', topicErr.message);
            }
        }

        const { rows } = await client.query(
            `INSERT INTO public.notifications (topic_id, title, message, severity, status, type, metadata)
             VALUES ($1, $2, $3, $4, 'new', $5, $6) RETURNING *`,
            [finalTopicId, title, message, severity, type || 'webhook', metadata || null]
        );
        
        const insertedNotification = rows[0];
        const pushResult = await sendOneSignalPush(client, insertedNotification);

        return jsonResponse(201, { ...insertedNotification, push_notification: pushResult }, {}, corsHeaders);
    }
    
    // POST /notifications/test
    if (method === 'POST' && isTest) {
        let topicId = null;
        try {
            const topicRes = await client.query(
                "SELECT id FROM public.topics WHERE name = 'Site Monitoring' LIMIT 1"
            );
            if (topicRes.rows.length > 0) {
                topicId = topicRes.rows[0].id;
            }
        } catch (topicErr) {
            console.warn('Could not query topics table for test alert:', topicErr.message);
        }
        const { rows } = await client.query(
            `INSERT INTO public.notifications (topic_id, title, message, severity, status, type)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                topicId,
                'Test Alert: Everything is Awesome!',
                'This is a test notification to confirm your alert setup is working correctly. No action is required.',
                'low',
                'new',
                'manual'
            ]
        );
        const insertedNotification = rows[0];
        const pushResult = await sendOneSignalPush(client, insertedNotification);

        return jsonResponse(201, { ...insertedNotification, push_notification: pushResult }, {}, corsHeaders);
    }

    if (notificationId && !isTest) {
        // POST /notifications/:id/comments
        if (isComments && method === 'POST') {
            if (!user || !user.id) {
              return jsonResponse(401, { error: 'Authentication is required to post a comment.'}, {}, corsHeaders);
            }
            const { text } = body;
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return jsonResponse(400, { error: 'Comment text is required and must be a non-empty string.' }, {}, corsHeaders);
            }
            const { rows } = await client.query(
                "INSERT INTO public.comments (notification_id, user_id, text) VALUES ($1, $2, $3) RETURNING *",
                [notificationId, user.id, text.trim()]
            );
            return jsonResponse(201, rows[0], {}, corsHeaders);
        }

        // GET /notifications/:id
        if (method === 'GET') {
            const notifQuery = client.query("SELECT * FROM public.notifications WHERE id = $1", [notificationId]);
            const commentsQuery = client.query(
                "SELECT c.id, c.text, c.created_at, c.user_id FROM public.comments c WHERE c.notification_id = $1 ORDER BY c.created_at ASC",
                [notificationId]
            );

            const [notifResult, commentsResult] = await Promise.all([notifQuery, commentsQuery]);

            if (notifResult.rows.length === 0) {
                return jsonResponse(404, { error: 'Notification not found' }, {}, corsHeaders);
            }

            const notification = notifResult.rows[0];
            notification.comments = commentsResult.rows.map(c => ({ ...c, user_full_name: null }));

            return jsonResponse(200, notification, {}, corsHeaders);
        }

        // PUT /notifications/:id
        if (method === 'PUT') {
            const { status } = body;
            const validStatuses = ['new', 'acknowledged', 'resolved'];
            if (!status || !validStatuses.includes(status)) {
                return jsonResponse(400, { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.` }, {}, corsHeaders);
            }
            const { rows } = await client.query(
                "UPDATE public.notifications SET status = $1 WHERE id = $2 RETURNING *",
                [status, notificationId]
            );
            if (rows.length === 0) {
                return jsonResponse(404, { error: 'Notification not found' }, {}, corsHeaders);
            }
            return jsonResponse(200, rows[0], {}, corsHeaders);
        }
    }

    // GET /notifications (list all)
    if (method === 'GET') {
        try {
            const { rows: notifications } = await client.query(`
                SELECT
                    n.id, n.topic_id, n.title, n.message, n.severity, n.status, n.type, n.metadata, n.created_at,
                    n.created_at AS timestamp, n.updated_at,
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT('id', c.id, 'text', c.text, 'user_id', c.user_id, 'created_at', c.created_at, 'user_full_name', NULL)
                            ORDER BY c.created_at ASC
                        ) FILTER (WHERE c.id IS NOT NULL),
                        '[]'::json
                    ) AS comments
                FROM public.notifications n
                LEFT JOIN public.comments c ON c.notification_id = n.id
                GROUP BY n.id
                ORDER BY n.created_at DESC
                LIMIT 200
            `);

            const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const uniqueUserIds = [...new Set(
                notifications.flatMap(n => (n.comments || []).map(c => c.user_id).filter(id => id && uuidPattern.test(id)))
            )];

            let userMap = {};
            if (uniqueUserIds.length > 0) {
                const placeholders = uniqueUserIds.map((_, i) => `$${i + 1}`).join(', ');
                const { rows: users } = await client.query(
                    `SELECT id::text, full_name FROM public.users WHERE id = ANY(ARRAY[${placeholders}]::uuid[])`,
                    uniqueUserIds
                );
                userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
            }

            const enriched = notifications.map(n => ({
                ...n,
                comments: (n.comments || []).map(c => ({
                    ...c,
                    user_full_name: userMap[c.user_id] || null,
                })),
            }));

            return jsonResponse(200, enriched, {}, corsHeaders);
        } catch (notifErr) {
            console.error('NOTIFICATIONS_QUERY_ERROR:', notifErr.message, notifErr.code, notifErr.detail);
            throw notifErr;
        }
    }

    return jsonResponse(405, { error: `Method ${method} Not Allowed on ${path}` }, {}, corsHeaders);
};


// =============================================================
//  MAIN LAMBDA HANDLER
// =============================================================

exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const requestOrigin = (event.headers || {}).origin || (event.headers || {}).Origin || '';
  if (requestOrigin && !corsHeaders['Access-Control-Allow-Origin']) {
      return jsonResponse(403, { error: 'CORS error: Origin not allowed' }, {}, corsHeaders);
  }

  const path = event.path;
  const method = event.httpMethod;
  const isPublicPost = method === 'POST' && (path.endsWith('/notifications') || path.endsWith('/notifications/test'));

  let user = null;
  if (!isPublicPost) {
    const authResult = await authenticate(event);
    if (!authResult.authenticated) {
      return jsonResponse(401, { error: authResult.error }, {}, corsHeaders);
    }
    user = authResult.user;
  }

  let client;

  try {
    initializePool();
    client = await pool.connect();
    const body = event.body ? JSON.parse(event.body) : {};

    return await handleNotifications(client, method, path, body, user, corsHeaders);

  } catch (err) {
    console.error('[DIAG_FATAL] Unhandled error in Notification Lambda:', err.message, err.stack);
    return jsonResponse(500, {
      error: 'Internal Server Error',
      details: err.message,
    }, {}, corsHeaders);
  } finally {
    if (client) client.release();
  }
};
