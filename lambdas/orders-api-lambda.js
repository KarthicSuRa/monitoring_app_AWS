/**
 * orders-api-lambda.js  (NEW)
 * REST API for order monitoring with full end-to-end fulfillment tracking.
 * Routes:
 *   GET  /orders                    — list orders with filters
 *   GET  /orders/:orderNo           — single order detail with timeline
 *   PUT  /orders/:orderNo           — manual fulfillment field update (ops team)
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');
const { TABLES, now } = require('./dynamo-client');

const rawClient = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(rawClient, { marshallOptions: { removeUndefinedValues: true } });

// ─── CORS ─────────────────────────────────────────────────────────────────

const getCorsHeaders = (event) => {
  const origin = (event.headers || {}).origin || (event.headers || {}).Origin || '';
  const cf = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
  const allowed = [cf, 'http://localhost:3000'].filter(Boolean);
  if (origin && allowed.includes(origin.replace(/\/$/, ''))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT',
    };
  }
  return {};
};

const json = (status, body, cors = {}) => ({
  statusCode: status,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {}),
});

// ─── Build Order Timeline Events ──────────────────────────────────────────

function buildTimeline(order) {
  const events = [];
  const add = (label, ts, status = 'done', detail = null) => {
    if (ts) events.push({ label, timestamp: ts, status, detail });
  };

  add('Order Placed', order.creation_date);
  add('Payment', order.creation_date, order.payment_status === 'PAID' ? 'done' :
      order.payment_status === 'FAILED' ? 'failed' : 'pending',
      order.payment_status + (order.payment_method ? ` (${order.payment_method})` : ''));
  add('Exported to WMS', order.export_status === 'EXPORTED' ? order.fulfillment_created_at : null,
      order.export_status === 'EXPORTED' ? 'done' :
      order.export_status === 'FAILED' ? 'failed' : 'pending',
      order.export_status);
  add('Fulfillment Order Created', order.fulfillment_created_at,
      order.fulfillment_order_id ? 'done' : 'pending',
      order.fulfillment_location ? `Location: ${order.fulfillment_location}` : null);
  add('Picking Started', order.picking_started_at,
      order.picking_status === 'IN_PICKING' ? 'in_progress' :
      order.picking_status === 'PICKED' ? 'done' :
      order.picking_status === 'FAILED' ? 'failed' : 'pending');
  add('Picking Complete', order.picking_completed_at,
      order.picking_status === 'PICKED' ? 'done' : 'pending');
  add('Packing Complete', order.packing_completed_at,
      order.packing_status === 'PACKED' ? 'done' : 'pending');
  add('Shipped', order.ship_date,
      order.shipment_status === 'SHIPPED' || order.shipment_status === 'DELIVERED' ? 'done' : 'pending',
      order.carrier ? `${order.carrier}${order.tracking_number ? ' — ' + order.tracking_number : ''}` : null);
  add('Delivered', order.delivery_date,
      order.shipment_status === 'DELIVERED' ? 'done' : 'pending');

  if (order.return_status && order.return_status !== 'NONE') {
    add('Return Requested', null, 'in_progress', order.return_status);
    if (order.return_tracking_number) {
      add('Return In Transit', null, 'in_progress', `Tracking: ${order.return_tracking_number}`);
    }
  }

  // Mark future steps as 'pending' 
  let doneSeen = false;
  const enriched = events.map(e => {
    if (e.status === 'in_progress') doneSeen = true;
    if (doneSeen && e.status === 'pending' && !e.timestamp) return { ...e, status: 'upcoming' };
    return e;
  });

  return enriched;
}

// ─── Query Orders ─────────────────────────────────────────────────────────

async function listOrders(qs) {
  const { site_id, fulfillment_status, shipment_status, date_from, date_to, limit = '50' } = qs || {};
  const maxItems = Math.min(parseInt(limit) || 50, 200);

  let items = [];

  if (site_id) {
    // Use GSI: site-modified-index
    const res = await dynamo.send(new QueryCommand({
      TableName: TABLES.ORDERS,
      IndexName: 'site-modified-index',
      KeyConditionExpression: 'site_id = :sid' + (date_from ? ' AND last_modified >= :df' : ''),
      ExpressionAttributeValues: {
        ':sid': site_id,
        ...(date_from ? { ':df': date_from } : {}),
      },
      ScanIndexForward: false,
      Limit: maxItems,
    }));
    items = res.Items || [];
  } else if (fulfillment_status) {
    const res = await dynamo.send(new QueryCommand({
      TableName: TABLES.ORDERS,
      IndexName: 'fulfillment-status-index',
      KeyConditionExpression: 'fulfillment_status = :fs',
      ExpressionAttributeValues: { ':fs': fulfillment_status },
      ScanIndexForward: false,
      Limit: maxItems,
    }));
    items = res.Items || [];
  } else if (shipment_status) {
    const res = await dynamo.send(new QueryCommand({
      TableName: TABLES.ORDERS,
      IndexName: 'shipment-status-index',
      KeyConditionExpression: 'shipment_status = :ss',
      ExpressionAttributeValues: { ':ss': shipment_status },
      ScanIndexForward: false,
      Limit: maxItems,
    }));
    items = res.Items || [];
  } else {
    // Full scan (bounded by limit) — acceptable for 500-600 orders/day
    const res = await dynamo.send(new ScanCommand({
      TableName: TABLES.ORDERS,
      Limit: maxItems * 3, // over-fetch to allow sorting
    }));
    items = res.Items || [];
    items.sort((a, b) => (b.last_modified || '').localeCompare(a.last_modified || ''));
    items = items.slice(0, maxItems);
  }

  // Apply date filter if provided with scan
  if (date_from) items = items.filter(o => o.last_modified >= date_from);
  if (date_to) items = items.filter(o => o.last_modified <= date_to);

  // Attach summary stats
  const stats = {
    total: items.length,
    byFulfillmentStatus: {},
    byShipmentStatus: {},
    exceptions: items.filter(o => (o.exception_flags || []).length > 0).length,
  };
  items.forEach(o => {
    stats.byFulfillmentStatus[o.fulfillment_status] = (stats.byFulfillmentStatus[o.fulfillment_status] || 0) + 1;
    stats.byShipmentStatus[o.shipment_status] = (stats.byShipmentStatus[o.shipment_status] || 0) + 1;
  });

  return { orders: items, stats };
}

async function getOrder(orderNo) {
  // Query all source_system variants for this order
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLES.ORDERS,
    KeyConditionExpression: 'order_no = :ono',
    ExpressionAttributeValues: { ':ono': orderNo },
  }));
  const items = res.Items || [];
  if (items.length === 0) return null;

  const order = items[0]; // primary version
  order.timeline = buildTimeline(order);
  order.all_versions = items; // include all source systems if multi-realm

  return order;
}

async function updateOrderFulfillment(orderNo, sourceSystem, updates) {
  const allowedFields = [
    'fulfillment_status', 'fulfillment_location', 'picking_status', 'picking_started_at',
    'picking_completed_at', 'packing_status', 'packing_completed_at', 'shipment_status',
    'carrier', 'tracking_number', 'ship_date', 'delivery_date',
    'return_status', 'return_tracking_number', 'exception_flags', 'last_event', 'last_event_at',
  ];

  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowedFields.includes(k))
  );
  filtered.updated_at = now();
  filtered.last_updated_at = now();

  const exprParts = Object.keys(filtered).map((k, i) => `#f${i} = :v${i}`);
  const expNames = {};
  const expValues = {};
  Object.keys(filtered).forEach((k, i) => { expNames[`#f${i}`] = k; expValues[`:v${i}`] = filtered[k]; });

  const res = await dynamo.send(new UpdateCommand({
    TableName: TABLES.ORDERS,
    Key: { order_no: orderNo, source_system: sourceSystem },
    UpdateExpression: `SET ${exprParts.join(', ')}`,
    ExpressionAttributeNames: expNames,
    ExpressionAttributeValues: expValues,
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const cors = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: cors, body: '' };

  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) return json(401, { error: 'Unauthorized' }, cors);

  const method = event.httpMethod;
  const path = (event.path || '').replace(/^\/prod/, '');
  const pathParts = path.split('/').filter(Boolean);
  const orderNo = pathParts[1]; // /orders/:orderNo
  const qs = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    if (method === 'GET' && !orderNo) {
      const result = await listOrders(qs);
      return json(200, result, cors);
    }

    if (method === 'GET' && orderNo) {
      const order = await getOrder(decodeURIComponent(orderNo));
      if (!order) return json(404, { error: 'Order not found' }, cors);
      return json(200, order, cors);
    }

    if (method === 'PUT' && orderNo) {
      const sourceSystem = qs.sourceSystem || body.source_system || 'SFCC:realm1';
      const updated = await updateOrderFulfillment(decodeURIComponent(orderNo), sourceSystem, body);
      if (!updated) return json(404, { error: 'Order not found' }, cors);
      return json(200, { ...updated, timeline: buildTimeline(updated) }, cors);
    }

    return json(404, { error: 'Not Found' }, cors);
  } catch (err) {
    console.error('orders-api-lambda error:', err.message, err.stack);
    return json(500, { error: 'Internal Server Error', details: err.message }, cors);
  }
};
