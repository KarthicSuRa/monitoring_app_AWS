const { Pool } = require('pg');

// --- Database Configuration ---
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

// --- CORS Configuration ---
const getCorsHeaders = (event) => {
  const cloudfrontUrl = process.env.CLOUDFRONT_URL; // This is set in the CDK
  const allowedOrigins = [
    'http://localhost:3000', // For local development
    cloudfrontUrl,
  ];
  const origin = event.headers?.origin;

  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    };
  }
  return {}; // Return empty headers for disallowed origins
};

// --- Response Utility ---
const jsonResponse = (statusCode, body, corsHeaders) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// --- Logic: Get Subscribers ---
const getSubscribers = async (topicId, corsHeaders) => {
  const { rows } = await pool.query(
    'SELECT p.id, p.full_name, p.email FROM topic_subscriptions ts JOIN profiles p ON p.id = ts.user_id WHERE ts.topic_id = $1',
    [topicId]
  );
  return jsonResponse(200, rows, corsHeaders);
};

// --- Logic: Toggle Subscription ---
const toggleSubscription = async (userId, topicId, corsHeaders) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id FROM topic_subscriptions WHERE user_id = $1 AND topic_id = $2',
      [userId, topicId]
    );

    let subscribed = false;
    if (rows.length > 0) {
      await client.query('DELETE FROM topic_subscriptions WHERE id = $1', [rows[0].id]);
      subscribed = false;
    } else {
      await client.query('INSERT INTO topic_subscriptions (user_id, topic_id) VALUES ($1, $2)', [userId, topicId]);
      subscribed = true;
    }
    await client.query('COMMIT');
    return jsonResponse(200, { success: true, subscribed }, corsHeaders);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error in toggleSubscription:", error);
    return jsonResponse(500, { error: 'Database transaction failed' }, corsHeaders);
  } finally {
    client.release();
  }
};

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  
  // Verify origin is allowed
  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return jsonResponse(403, { error: "Origin not allowed" }, {});
  }

  const { httpMethod, path, pathParameters, requestContext } = event;

  const topicId = pathParameters?.topicId;
  if (!topicId) {
    return jsonResponse(400, { error: "Missing topicId in path" }, corsHeaders);
  }

  const userId = requestContext.authorizer?.claims?.sub;
  if (!userId) {
    return jsonResponse(401, { error: 'Unauthorized' }, corsHeaders);
  }

  const pathSuffix = path.substring(path.lastIndexOf('/'));

  try {
    if (httpMethod === 'POST' && pathSuffix === '/subscription') {
      return await toggleSubscription(userId, topicId, corsHeaders);
    }
    if (httpMethod === 'GET' && pathSuffix === '/subscribers') {
      return await getSubscribers(topicId, corsHeaders);
    }
    return jsonResponse(404, { error: 'Not Found' }, corsHeaders);
  } catch (error) {
    console.error('Lambda execution error:', error);
    return jsonResponse(500, { error: 'Internal Server Error' }, corsHeaders);
  }
};