const { Pool } = require("pg");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

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

// =============================================================
//  SNS Push Notification Sender (FCM v1)
// =============================================================
const sendSnsPush = async (notification) => {
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (!topicArn) {
        console.warn('SNS_TOPIC_ARN environment variable not set. Skipping push notification.');
        return null;
    }

    const fcmV1Message = {
        message: {
            notification: {
                title: notification.title,
                body: notification.message,
            },
            webpush: {
                fcm_options: {
                    link: process.env.CLOUDFRONT_URL || 'http://localhost:3000',
                },
                notification: {
                    icon: `${process.env.CLOUDFRONT_URL || 'http://localhost:3000'}/mcm-logo.png`,
                },
            },
            data: {
                notificationId: notification.id,
                severity: notification.severity,
                type: notification.type,
                topic_id: notification.topic_id,
                status: notification.status,
                created_at: notification.created_at,
            },
        },
    };

    const messagePayload = {
        default: `New notification: ${notification.title}`,
        GCM: JSON.stringify({ fcmV1Message })
    };

    const command = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(messagePayload),
        MessageStructure: 'json'
    });

    try {
        const result = await snsClient.send(command);
        console.log("Successfully sent FCM v1 push notification via SNS:", result.MessageId);
        return result;
    } catch (err) {
        console.error("Failed to send SNS push notification:", err.message, err.stack);
        return { error: err.message };
    }
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

    // POST /notifications (generic, webhook-driven)
    if (isGenericPost) {
        const { topic_id, topic_name, title, message, severity, type, metadata } = body;
        if (!title || !message || !severity) {
            return jsonResponse(400, { error: 'Missing required fields: title, message, severity' }, {}, corsHeaders);
        }

        let finalTopicId = topic_id || null;

        // If topic name is provided, try to find its ID
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
        // Send a push notification for the newly created alert
        const pushResult = await sendSnsPush(insertedNotification);

        return jsonResponse(201, { ...insertedNotification, push_notification: pushResult }, {}, corsHeaders);
    }
    
    // POST /notifications/test (for admins/devs to test push notifications)
    if (method === 'POST' && isTest) {
        let topicId = null;
        try {
            // Find a common topic to associate the test alert with, if it exists.
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
        const pushResult = await sendSnsPush(insertedNotification);

        return jsonResponse(201, { ...insertedNotification, push_notification: pushResult }, {}, corsHeaders);
    }

    // All endpoints below this point require authentication
    if (!user) {
        return jsonResponse(401, { error: 'Unauthorized' }, {}, corsHeaders);
    }

    if (notificationId && !isTest) {
        // POST /notifications/:id/comments
        if (isComments && method === 'POST') {
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
                // Use parameterized query for security and efficiency
                const userQuery = `SELECT id::text, full_name FROM public.users WHERE id = ANY($1::uuid[])`;
                const { rows: users } = await client.query(userQuery, [uniqueUserIds]);
                userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
            }

            // Enrich comments with user names
            const enriched = notifications.map(n => ({
                ...n,
                comments: (n.comments || []).map(c => ({
                    ...c,
                    user_full_name: userMap[c.user_id] || null,
                })),
            }));

            return jsonResponse(200, enriched, {}, corsHeaders);
        } catch (notifErr) {
            console.error('NOTIFICATIONS_QUERY_ERROR:', notifErr.message, notifErr.stack);
            return jsonResponse(500, { error: 'Failed to retrieve notifications', details: notifErr.message }, {}, corsHeaders);
        }
    }

    return jsonResponse(405, { error: `Method ${method} Not Allowed on ${path}` }, {}, corsHeaders);
};


// =============================================================
//  MAIN LAMBDA HANDLER
// =============================================================

exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  
  // Some POST endpoints are public (e.g., from webhooks) and don't need auth.
  const path = event.path.replace(/^\/prod/, ''); // Strip stage if present
  const method = event.httpMethod;
  const isPublicPost = method === 'POST' && (path === '/notifications' || path === '/notifications/test');
  
  let user = null;
  // If the endpoint is not public, it requires authentication.
  if (!isPublicPost) {
      const claims = event.requestContext.authorizer?.claims;
      // If there are no claims, the request is unauthorized.
      if (!claims) {
          return jsonResponse(401, { error: 'Unauthorized: No valid token provided.' }, {}, corsHeaders);
      }
      // Reconstruct the user object from the token claims
      user = {
          id: claims.sub,
          email: claims.email,
          app_role: claims['custom:app_role'] || 'member' // Default to 'member' if not specified
      };
  }

  let client;
  try {
    initializePool();
    client = await pool.connect();
    
    // On authenticated requests, ensure the user exists in the local DB.
    if (user && user.id) {
        await client.query(
            `INSERT INTO public.users (id, email, app_role) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO NOTHING`,
            [user.id, user.email, user.app_role]
        );
    }

    const body = event.body ? JSON.parse(event.body) : {};

    return await handleNotifications(client, method, path, body, user, corsHeaders);

  } catch (err) {
    // Catch-all for unexpected errors
    console.error('[FATAL] Unhandled error in Notification Lambda:', err.message, err.stack);
    return jsonResponse(500, {
      error: 'Internal Server Error',
      details: err.message,
    }, {}, corsHeaders);
  } finally {
    if (client) client.release(); // Ensure the database client is always released.
  }
};
