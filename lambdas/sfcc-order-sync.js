import { Pool } from "pg";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Database connection pool, initialized lazily.
let pool;

// AWS Lambda Client
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const REALMS = [
  { key: "realm1", baseUrl: process.env.REALM_1_BASE_URL, clientId: process.env.REALM_1_CLIENT_ID, clientSecret: process.env.REALM_1_CLIENT_SECRET },
  { key: "realm2", baseUrl: process.env.REALM_2_BASE_URL, clientId: process.env.REALM_2_CLIENT_ID, clientSecret: process.env.REALM_2_CLIENT_SECRET },
  { key: "realm3", baseUrl: process.env.REALM_3_BASE_URL, clientId: process.env.REALM_3_CLIENT_ID, clientSecret: process.env.REALM_3_CLIENT_SECRET },
];

/**
 * Initializes the database connection pool.
 */
function initializePool() {
  if (pool) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

/**
 * Gets an OAuth2 access token from SFCC.
 */
async function getAccessToken(baseUrl, clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/dw/oauth2/access_token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`SFCC token error: ${res.status} - ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

/**
 * Searches for orders in SFCC that have been modified since the last sync.
 */
async function searchOrders(baseUrl, token, clientId, lastSync) {
  const url = `${baseUrl}/dw/data/v23_2/orders/search?client_id=${clientId}`;
  const body = {
    query: {
      filtered_query: {
        query: { match_all_query: {} },
        filter: { range_filter: { field: "last_modified", from: lastSync } },
      },
    },
    select: "(order_no,site_id,status,creation_date,last_modified)",
    sorts: [{ field: "last_modified", sort_order: "asc" }],
    count: 200, // Max per page
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SFCC order search error: ${res.status} - ${await res.text()}`);
  return res.json();
}

/**
 * Performs a bulk "upsert" of SFCC order data into the database.
 */
async function upsertOrders(client, orders, realmKey) {
  const values = orders.flatMap(h => 
    [h.data.order_no, realmKey, h.data.site_id, h.data.status, h.data.creation_date, h.data.last_modified, JSON.stringify(h.data)]
  );

  const query = `
    INSERT INTO sfcc_orders (order_no, realm_key, site_id, status, creation_date, last_modified, data)
    SELECT * FROM unnest(
      $1::text[], $2::text[], $3::text[], $4::text[], $5::timestamptz[], $6::timestamptz[], $7::jsonb[]
    ) AS t(order_no, realm_key, site_id, status, creation_date, last_modified, data)
    ON CONFLICT (order_no, realm_key) DO UPDATE SET
      status = EXCLUDED.status,
      last_modified = EXCLUDED.last_modified,
      data = EXCLUDED.data,
      updated_at = NOW();
  `;
  
  await client.query(query, [
    orders.map(o => o.data.order_no),
    Array(orders.length).fill(realmKey),
    orders.map(o => o.data.site_id),
    orders.map(o => o.data.status),
    orders.map(o => o.data.creation_date),
    orders.map(o => o.data.last_modified),
    orders.map(o => JSON.stringify(o.data)),
  ]);
  
  return orders.map(o => o.data.order_no);
}

// --- Main Handler ---
export const handler = async () => {
  initializePool();
  const dbClient = await pool.connect();
  const summary = { totalSynced: 0, realmsProcessed: 0, errors: [] };
  const syncedOrderNumbers = [];

  try {
    for (const realm of REALMS) {
      if (!realm.baseUrl) continue;
      summary.realmsProcessed++;
      try {
        const token = await getAccessToken(realm.baseUrl, realm.clientId, realm.clientSecret);
        
        const { rows } = await dbClient.query(
          `SELECT MAX(last_modified) as last_sync FROM sfcc_orders WHERE realm_key = $1`,
          [realm.key]
        );
        const lastSync = rows[0]?.last_sync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const result = await searchOrders(realm.baseUrl, token, realm.clientId, lastSync);
        const hits = result.hits || [];

        if (hits.length > 0) {
          const upsertedOrders = await upsertOrders(dbClient, hits, realm.key);
          syncedOrderNumbers.push(...upsertedOrders);
          summary.totalSynced += hits.length;
        }
      } catch (err) {
        summary.errors.push({ realm: realm.key, error: err.message });
      }
    }

    // If any orders were synced, trigger the next Lambda in the chain
    if (syncedOrderNumbers.length > 0) {
      await lambdaClient.send(
        new InvokeCommand({
          FunctionName: process.env.SOM_ORDER_LAMBDA_NAME, // The name of the next function
          InvocationType: "Event", // Asynchronous invocation
          Payload: Buffer.from(JSON.stringify({ orderNumbers: syncedOrderNumbers })),
        })
      );
    }

  } catch (fatal) {
    summary.errors.push({ realm: "N/A", error: `Fatal error: ${fatal.message}` });
  } finally {
    dbClient.release();
  }

  if (summary.errors.length > 0) {
    console.error("SFCC Sync finished with errors:", summary.errors);
    // Optionally, you can have this function return an error status if any realm fails
  }

  return {
    statusCode: summary.errors.length > 0 ? 500 : 200,
    body: JSON.stringify(summary),
  };
};