/**
 * topic-subscribers-lambda.js  (DynamoDB rewrite)
 * Handles topic subscription toggle and subscriber listing.
 */
const {
  TABLES, now, newId,
  getItem, putItem, deleteItem,
  queryItems, scanItems,
} = require('./dynamo-client');

const getCorsHeaders = (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const cf = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
  const allowed = [cf, 'http://localhost:3000'].filter(Boolean);
  if (origin && allowed.includes(origin.replace(/\/$/, ''))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
    };
  }
  return {};
};

const json = (status, body, cors = {}) => ({
  statusCode: status,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const getSubscribers = async (topicId, cors) => {
  const subs = await queryItems(TABLES.TOPIC_SUBSCRIPTIONS, {
    IndexName: 'topic-id-index',
    KeyConditionExpression: 'topic_id = :tid',
    ExpressionAttributeValues: { ':tid': topicId },
  });
  // Enrich with user info
  const enriched = await Promise.all(subs.map(async (s) => {
    const user = await getItem(TABLES.USERS, { id: s.user_id });
    return { user_id: s.user_id, full_name: user?.full_name, email: user?.email };
  }));
  return json(200, enriched, cors);
};

const toggleSubscription = async (userId, topicId, cors) => {
  const existing = await getItem(TABLES.TOPIC_SUBSCRIPTIONS, { user_id: userId, topic_id: topicId });

  if (existing) {
    await deleteItem(TABLES.TOPIC_SUBSCRIPTIONS, { user_id: userId, topic_id: topicId });
    return json(200, { success: true, subscribed: false }, cors);
  } else {
    await putItem(TABLES.TOPIC_SUBSCRIPTIONS, {
      user_id: userId,
      topic_id: topicId,
      created_at: now(),
    });
    return json(200, { success: true, subscribed: true }, cors);
  }
};

exports.handler = async (event) => {
  const cors = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: cors, body: '' };

  const topicId = event.pathParameters?.topicId;
  if (!topicId) return json(400, { error: 'Missing topicId' }, cors);

  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) return json(401, { error: 'Unauthorized' }, cors);

  const path = event.path || '';
  const suffix = path.substring(path.lastIndexOf('/'));

  try {
    if (event.httpMethod === 'POST' && suffix === '/subscription')
      return await toggleSubscription(userId, topicId, cors);
    if (event.httpMethod === 'GET' && suffix === '/subscribers')
      return await getSubscribers(topicId, cors);
    return json(404, { error: 'Not Found' }, cors);
  } catch (err) {
    console.error('topic-subscribers-lambda error:', err.message);
    return json(500, { error: 'Internal Server Error', details: err.message }, cors);
  }
};