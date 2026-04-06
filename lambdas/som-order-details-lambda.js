/**
 * som-order-details-lambda.js  (DynamoDB rewrite)
 * Fetches fulfillment details from Salesforce Order Management (SOM)
 * and enriches the mcm-orders DynamoDB table with end-to-end tracking data.
 *
 * Triggered by sfcc-order-sync.js (async invocation with { orderNumbers: [...] })
 * or via API Gateway for direct on-demand lookup.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { TABLES, now } = require('./dynamo-client');

const dynamoRaw = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(dynamoRaw, { marshallOptions: { removeUndefinedValues: true } });

async function getSalesforceToken() {
  const { SALESFORCE_HOST, SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET } = process.env;
  if (!SALESFORCE_HOST || !SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET) {
    throw new Error('Missing Salesforce environment variables');
  }
  const res = await fetch(`https://${SALESFORCE_HOST}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`SF token failed: ${await res.text()}`);
  const j = await res.json();
  return j.access_token;
}

async function querySomOrders(token, orderNumbers) {
  const { SALESFORCE_HOST } = process.env;
  const escaped = orderNumbers.map(n => `'${n.replace(/'/g, "\\'")}'`).join(',');
  const soql = `
    SELECT
      Id, OrderNumber, Status, GrandTotalAmount, OrderedDate, LastModifiedDate,
      CurrencyIsoCode, BillingAddress,
      (SELECT Id, Amount, Method, FM_PaymentMethod__c FROM OrderPaymentSummaries),
      (SELECT
         Id, Status, FulfilledFromLocation.Name, CreatedDate,
         (SELECT Id, Status, TrackingNumber, Carrier, ShipmentDate, DeliveredDate FROM Shipments)
       FROM FulfillmentOrders)
    FROM OrderSummary
    WHERE OrderNumber IN (${escaped})
    LIMIT 200
  `;
  const res = await fetch(
    `https://${SALESFORCE_HOST}/services/data/v60.0/query/?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  if (!res.ok) throw new Error(`SOM SOQL failed: ${await res.text()}`);
  const j = await res.json();
  return j.records || [];
}

/**
 * Map a SOM OrderSummary record to fulfillment tracking fields.
 */
function mapFulfillmentFields(somRecord) {
  const fulfillmentOrders = somRecord.FulfillmentOrders?.records || [];
  const firstFO = fulfillmentOrders[0] || null;
  const shipments = firstFO?.Shipments?.records || [];
  const firstShipment = shipments[0] || null;

  // Determine aggregate statuses
  const foStatuses = fulfillmentOrders.map(fo => (fo.Status || '').toUpperCase());
  const shipStatuses = shipments.map(s => (s.Status || '').toUpperCase());

  // Fulfillment status: derive from FO statuses
  let fulfillmentStatus = 'PENDING';
  if (foStatuses.includes('CANCELLED')) fulfillmentStatus = 'CANCELLED';
  else if (foStatuses.includes('CLOSED')) fulfillmentStatus = 'FULFILLED';
  else if (foStatuses.some(s => s.includes('PICKING') || s === 'ALLOCATED')) fulfillmentStatus = 'PICKING';
  else if (foStatuses.some(s => s.includes('PACK'))) fulfillmentStatus = 'PACKING';
  else if (foStatuses.some(s => s === 'SHIPPED' || s === 'FULFILLED')) fulfillmentStatus = 'SHIPPED';
  else if (foStatuses.length > 0) fulfillmentStatus = 'PROCESSING';

  // Picking status
  let pickingStatus = 'PENDING';
  let pickingStartedAt = null;
  let pickingCompletedAt = null;
  if (foStatuses.some(s => s === 'ALLOCATED')) { pickingStatus = 'IN_PICKING'; pickingStartedAt = firstFO?.CreatedDate; }
  if (foStatuses.some(s => s === 'PICKED' || s === 'SHIPPED' || s === 'CLOSED')) {
    pickingStatus = 'PICKED';
    pickingCompletedAt = firstShipment?.ShipmentDate || null;
  }

  // Packing status
  const packingStatus = ['PACKING', 'PACKED', 'SHIPPED', 'CLOSED', 'FULFILLED'].some(s => foStatuses.includes(s))
    ? 'PACKED' : 'PENDING';
  const packingCompletedAt = packingStatus === 'PACKED' ? firstShipment?.ShipmentDate : null;

  // Shipping
  const shipmentStatus = (() => {
    if (shipStatuses.includes('DELIVERED')) return 'DELIVERED';
    if (shipStatuses.some(s => s === 'SHIPPED' || s === 'IN_TRANSIT')) return 'SHIPPED';
    if (shipments.length > 0) return 'PENDING';
    return 'PENDING';
  })();

  // Return status
  let returnStatus = 'NONE';

  // Last event
  const lastEvent = (() => {
    if (shipmentStatus === 'DELIVERED') return `Delivered by ${firstShipment?.Carrier || 'carrier'}`;
    if (shipmentStatus === 'SHIPPED') return `Shipped via ${firstShipment?.Carrier || 'carrier'} — ${firstShipment?.TrackingNumber || ''}`;
    if (packingStatus === 'PACKED') return 'Packed and ready to ship';
    if (pickingStatus === 'PICKED') return 'Picking complete';
    if (pickingStatus === 'IN_PICKING') return 'Picking in progress';
    if (fulfillmentStatus === 'PROCESSING') return 'Fulfillment order created';
    return `Order ${somRecord.Status}`;
  })();

  return {
    fulfillment_status: fulfillmentStatus,
    fulfillment_order_id: firstFO?.Id || null,
    fulfillment_location: firstFO?.FulfilledFromLocation?.Name || null,
    fulfillment_created_at: firstFO?.CreatedDate || null,
    picking_status: pickingStatus,
    picking_started_at: pickingStartedAt,
    picking_completed_at: pickingCompletedAt,
    packing_status: packingStatus,
    packing_completed_at: packingCompletedAt,
    shipment_status: shipmentStatus,
    shipment_id: firstShipment?.Id || null,
    carrier: firstShipment?.Carrier || null,
    tracking_number: firstShipment?.TrackingNumber || null,
    ship_date: firstShipment?.ShipmentDate || null,
    delivery_date: firstShipment?.DeliveredDate || null,
    return_status: returnStatus,
    last_event: lastEvent,
    last_event_at: now(),
    updated_at: now(),
    last_updated_at: now(),
  };
}

async function enrichOrderInDynamo(orderNo, fields) {
  // We need to update all source_system variants for this order_no
  // Since source_system is SK, we update individual records
  // The SFCC sync already wrote them with source_system = 'SFCC:realmX'
  // We use a scan by PK (order_no) approach — in practice it's 1 item per order
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
  const c = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
  const res = await c.send(new (require('@aws-sdk/lib-dynamodb').QueryCommand)({
    TableName: TABLES.ORDERS,
    KeyConditionExpression: 'order_no = :ono',
    ExpressionAttributeValues: { ':ono': orderNo },
  }));

  const records = res.Items || [];
  for (const record of records) {
    const exprParts = Object.keys(fields).map((k, i) => `#f${i} = :v${i}`);
    const expNames = {};
    const expValues = {};
    Object.keys(fields).forEach((k, i) => {
      expNames[`#f${i}`] = k;
      expValues[`:v${i}`] = fields[k];
    });
    await dynamo.send(new UpdateCommand({
      TableName: TABLES.ORDERS,
      Key: { order_no: record.order_no, source_system: record.source_system },
      UpdateExpression: `SET ${exprParts.join(', ')}`,
      ExpressionAttributeNames: expNames,
      ExpressionAttributeValues: expValues,
    }));
  }
}

// ─── CORS helper (for API Gateway direct calls) ────────────────────────────
const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────

exports.handler = async (event) => {
  try {
    // If invoked async from sfcc-order-sync, event has { orderNumbers: [...] }
    const isAsyncInvocation = Array.isArray(event?.orderNumbers);

    let orderNumbers = [];
    let singleLookup = false;

    if (isAsyncInvocation) {
      orderNumbers = event.orderNumbers;
    } else {
      // API Gateway invocation
      const body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};
      const qs = event.queryStringParameters || {};

      if (qs.orderId || body.orderId) {
        orderNumbers = [qs.orderId || body.orderId];
        singleLookup = true;
      } else if (qs.trackingNumber || body.trackingNumber) {
        // Not feasible as a batch — do a direct SOM query
        const token = await getSalesforceToken();
        const soql = `
          SELECT Id, OrderNumber, Status, (SELECT Id, Status, TrackingNumber, Carrier, ShipmentDate, DeliveredDate FROM Shipments)
          FROM FulfillmentOrder
          WHERE Id IN (SELECT FulfillmentOrderId FROM Shipment WHERE TrackingNumber = '${(qs.trackingNumber || body.trackingNumber).replace(/'/g, "\\'")}')
        `;
        const res = await fetch(
          `https://${process.env.SALESFORCE_HOST}/services/data/v60.0/query/?q=${encodeURIComponent(soql)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const j = await res.json();
        return json(200, { success: true, records: j.records || [] });
      } else {
        return json(400, { error: 'Provide orderId or trackingNumber' });
      }
    }

    if (orderNumbers.length === 0) return json(200, { success: true, enriched: 0 });

    const token = await getSalesforceToken();
    // Batch in chunks of 50
    const CHUNK = 50;
    let enrichedCount = 0;
    const records = [];

    for (let i = 0; i < orderNumbers.length; i += CHUNK) {
      const chunk = orderNumbers.slice(i, i + CHUNK);
      const somRecords = await querySomOrders(token, chunk);

      for (const somRecord of somRecords) {
        const fields = mapFulfillmentFields(somRecord);
        await enrichOrderInDynamo(somRecord.OrderNumber, fields);
        enrichedCount++;
        records.push({ orderNumber: somRecord.OrderNumber, ...fields });
      }
    }

    console.log(`Enriched ${enrichedCount} orders with SOM fulfillment data`);

    if (!isAsyncInvocation) {
      return json(200, { success: true, enriched: enrichedCount, records: singleLookup ? records[0] : records });
    }
  } catch (err) {
    console.error('SOM Lambda error:', err.message, err.stack);
    if (event.httpMethod) return json(500, { error: err.message });
    // For async invocations, re-throw to trigger Lambda retry
    throw err;
  }
};