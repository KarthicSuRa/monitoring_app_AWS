/**
 * sfcc-order-sync.js  (DynamoDB rewrite)
 * Syncs orders from SFCC realms into DynamoDB (mcm-sfcc-orders + mcm-orders)
 * with full fulfillment tracking fields.
 */
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const {
  TABLES, now, ttlDays,
  getItem, putItem, queryItems,
} = require('./dynamo-client');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoRaw = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(dynamoRaw, { marshallOptions: { removeUndefinedValues: true } });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const REALMS = [
  { key: 'realm1', baseUrl: process.env.REALM_1_BASE_URL, clientId: process.env.REALM_1_CLIENT_ID, clientSecret: process.env.REALM_1_CLIENT_SECRET },
  { key: 'realm2', baseUrl: process.env.REALM_2_BASE_URL, clientId: process.env.REALM_2_CLIENT_ID, clientSecret: process.env.REALM_2_CLIENT_SECRET },
  { key: 'realm3', baseUrl: process.env.REALM_3_BASE_URL, clientId: process.env.REALM_3_CLIENT_ID, clientSecret: process.env.REALM_3_CLIENT_SECRET },
];

async function getAccessToken(baseUrl, clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${baseUrl}/dw/oauth2/access_token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`SFCC token error: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

async function searchOrders(baseUrl, token, clientId, lastSync) {
  const url = `${baseUrl}/dw/data/v23_2/orders/search?client_id=${clientId}`;
  const body = {
    query: {
      filtered_query: {
        query: { match_all_query: {} },
        filter: { range_filter: { field: 'last_modified', from: lastSync } },
      },
    },
    select: '(order_no,site_id,status,payment_status,shipping_status,creation_date,last_modified,' +
            'total_gross_price,currency_code,customer_email,export_status,' +
            'payment_instruments.payment_method_id,holds.type)',
    sorts: [{ field: 'last_modified', sort_order: 'asc' }],
    count: 200,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SFCC order search error: ${res.status}`);
  return res.json();
}

async function upsertSfccOrder(order, realmKey) {
  const ts = now();
  const item = {
    order_no: order.order_no,
    realm_key: realmKey,
    site_id: order.site_id || 'unknown',
    status: order.status,
    creation_date: order.creation_date,
    last_modified: order.last_modified,
    data: order,
    created_at: ts,
    updated_at: ts,
  };
  await dynamo.send(new PutCommand({
    TableName: TABLES.SFCC_ORDERS,
    Item: item,
  }));
}

async function upsertNormalizedOrder(order, realmKey) {
  const ts = now();
  // Build normalized order with all fulfillment tracking fields
  // Fulfillment fields start as PENDING/null; SOM lambda will enrich them
  const paymentMethod = order.payment_instruments?.[0]?.payment_method_id || null;
  const hasHold = Array.isArray(order.holds) && order.holds.length > 0;
  const holdTypes = hasHold ? order.holds.map(h => h.type) : [];

  const item = {
    order_no: order.order_no,
    source_system: `SFCC:${realmKey}`,
    site_id: order.site_id || 'unknown',

    // ─── Order basics ────
    order_status: order.status || 'unknown',
    order_total: order.total_gross_price?.value || 0,
    currency: order.currency_code || 'USD',
    creation_date: order.creation_date,
    last_modified: order.last_modified,
    customer_email: order.customer_email || null,

    // ─── Payment ─────────
    payment_status: order.payment_status || 'PENDING',
    payment_method: paymentMethod,

    // ─── Export ──────────
    export_status: order.export_status || 'NOT_EXPORTED',

    // ─── Fulfillment (enriched by SOM lambda later) ───
    fulfillment_status: 'PENDING',
    fulfillment_order_id: null,
    fulfillment_location: null,
    fulfillment_created_at: null,

    // ─── Picking ─────────
    picking_status: 'PENDING',
    picking_started_at: null,
    picking_completed_at: null,

    // ─── Packing ─────────
    packing_status: 'PENDING',
    packing_completed_at: null,

    // ─── Shipping ────────
    shipment_status: 'PENDING',
    shipment_id: null,
    carrier: null,
    tracking_number: null,
    ship_date: null,
    delivery_date: null,

    // ─── Returns ─────────
    return_status: 'NONE',
    return_tracking_number: null,

    // ─── Exceptions ──────
    exception_flags: holdTypes,

    // ─── Last event ──────
    last_event: `Order ${order.status}`,
    last_event_at: order.last_modified,

    // ─── Timestamps ──────
    created_at: ts,
    updated_at: ts,
    last_updated_at: ts,
  };

  await dynamo.send(new PutCommand({
    TableName: TABLES.ORDERS,
    Item: item,
  }));

  return order.order_no;
}

exports.handler = async () => {
  const summary = { totalSynced: 0, realmsProcessed: 0, errors: [] };
  const syncedOrderNumbers = [];

  for (const realm of REALMS) {
    if (!realm.baseUrl) continue;
    summary.realmsProcessed++;
    try {
      const token = await getAccessToken(realm.baseUrl, realm.clientId, realm.clientSecret);

      // Find last sync timestamp
      const recentOrders = await queryItems(TABLES.SFCC_ORDERS, {
        IndexName: 'realm-modified-index',
        KeyConditionExpression: 'realm_key = :rk',
        ExpressionAttributeValues: { ':rk': realm.key },
        ScanIndexForward: false,
        Limit: 1,
      });
      const lastSync = recentOrders[0]?.last_modified
        || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const result = await searchOrders(realm.baseUrl, token, realm.clientId, lastSync);
      const hits = result.hits || [];

      for (const hit of hits) {
        const order = hit.data;
        await upsertSfccOrder(order, realm.key);
        const orderNo = await upsertNormalizedOrder(order, realm.key);
        syncedOrderNumbers.push(orderNo);
      }
      summary.totalSynced += hits.length;
    } catch (err) {
      console.error(`Realm ${realm.key} error:`, err.message);
      summary.errors.push({ realm: realm.key, error: err.message });
    }
  }

  // Invoke SOM Lambda to enrich fulfillment data for newly synced orders
  if (syncedOrderNumbers.length > 0 && process.env.SOM_ORDER_LAMBDA_NAME) {
    try {
      await lambdaClient.send(new InvokeCommand({
        FunctionName: process.env.SOM_ORDER_LAMBDA_NAME,
        InvocationType: 'Event', // async
        Payload: Buffer.from(JSON.stringify({ orderNumbers: syncedOrderNumbers })),
      }));
    } catch (err) {
      console.warn('SOM lambda invoke failed:', err.message);
    }
  }

  if (summary.errors.length > 0) console.error('SFCC sync errors:', summary.errors);

  return {
    statusCode: summary.errors.length > 0 ? 207 : 200,
    body: JSON.stringify(summary),
  };
};