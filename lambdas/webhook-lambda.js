const { Pool } = require('pg');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Adyen-HMAC-Signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

let pool;
function initializePool() {
  if (pool) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set.');
  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

// ... (transform functions remain the same)

async function handleGet(client) {
    const { rows } = await client.query('SELECT * FROM public.webhook_sources ORDER BY created_at DESC');
    return createResponse(200, rows);
}

async function handlePost(event, client) {
    const { source_id } = event.queryStringParameters || {};
    if (!source_id) return createResponse(400, { error: 'Missing source_id query parameter' });

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return createResponse(400, { error: 'Request body is not valid JSON.' });
    }
    
    const { rows: [source] } = await client.query('SELECT * FROM public.webhook_sources WHERE id = $1', [source_id]);
    if (!source) return createResponse(404, { error: 'Webhook source not found' });

    // ... (rest of the POST logic remains the same)
}

async function handlePut(event, client) {
    const { name, description, source_type, topic_id, user_id } = JSON.parse(event.body);
    if (!name || !user_id) {
        return createResponse(400, { error: 'Missing required fields: name, user_id' });
    }
    const { rows: [newSource] } = await client.query(
        `INSERT INTO public.webhook_sources (name, description, source_type, topic_id, user_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, description, source_type, topic_id, user_id]
    );
    return createResponse(201, newSource);
}

async function handleDelete(event, client) {
    const { id } = event.queryStringParameters || {};
    if (!id) return createResponse(400, { error: 'Missing id query parameter' });

    await client.query('DELETE FROM public.webhook_sources WHERE id = $1', [id]);
    return createResponse(204, null);
}

exports.handler = async (event) => {
    if (event.requestContext.http.method === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    initializePool();
    const client = await pool.connect();

    try {
        switch (event.requestContext.http.method) {
            case 'GET':
                return await handleGet(client);
            case 'POST':
                 return await handlePost(event, client);
            case 'PUT':
                return await handlePut(event, client);
            case 'DELETE':
                return await handleDelete(event, client);
            default:
                return createResponse(405, { error: `Method ${event.requestContext.http.method} not allowed` });
        }
    } catch (err) {
        console.error(`FATAL webhook-lambda error:`, err);
        return createResponse(500, { error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};