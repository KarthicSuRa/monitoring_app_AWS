import { Pool } from "pg";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const FAKE_USER_AGENT = "MCM Monitor Alerts";

// The database pool is initialized lazily and reused across warm invocations.
let pool;

/**
 * Initializes the database connection pool using the DATABASE_URL environment variable.
 */
function initializePool() {
  if (pool) {
    return; // Pool is already initialized
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false // Adjust as required by your RDS SSL configuration
    }
  });
}

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  try {
    initializePool();
    const client = await pool.connect();

    // 1️⃣ Fetch active sites from the database
    const { rows: sites } = await client.query(
      "SELECT id, url, name, country, status FROM monitored_sites WHERE status = 'active' AND is_paused = false"
    );

    console.log(`Found ${sites.length} active sites to monitor.`);

    // 2️⃣ Check each site
    const results = await Promise.all(
      sites.map(async (site) => {
        const start = Date.now();
        let status_code = 0, is_up = false, response_time_ms = 0, status_text = "", error_message = null;

        try {
          const response = await fetch(site.url, {
            method: "GET",
            headers: { "User-Agent": FAKE_USER_AGENT },
            redirect: "follow",
          });

          response_time_ms = Date.now() - start;
          status_code = response.status;
          status_text = response.statusText;
          is_up = response.ok; // .ok is true for statuses 200-299

          if (!is_up) {
            error_message = `Server responded with status: ${status_code} ${status_text}`;
          }
        } catch (e) {
          response_time_ms = Date.now() - start;
          error_message = e.message;
          is_up = false;
        }

        return { site_id: site.id, is_up, response_time_ms, status_code, status_text, error_message };
      })
    );

    // 3️⃣ Bulk insert the ping logs
    if (results.length > 0) {
      const insertQuery = `
        INSERT INTO ping_logs 
        (site_id, is_up, response_time_ms, status_code, status_text, error_message)
        VALUES ${results.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(",")}
      `;
      const values = results.flatMap((r) => [r.site_id, r.is_up, r.response_time_ms, r.status_code, r.status_text, r.error_message]);
      await client.query(insertQuery, values);
    }

    // 4️⃣ Trigger notifications for down sites
    const downSites = results.filter((r) => !r.is_up);

    await Promise.all(
      downSites.map(async (result) => {
        const site = sites.find((s) => s.id === result.site_id);
        if (!site) return;

        const payload = {
          title: `Site Down Alert: ${site.name}`,
          message: `The monitored site "${site.name}" (${site.country || 'N/A'}) was detected as down. Error: ${result.error_message || "No details available."}`,
          severity: "high",
          type: "site_alert",
          site: site.name,
          topic_name: "Site Monitoring",
        };

        await lambdaClient.send(
          new InvokeCommand({
            FunctionName: process.env.NOTIFICATION_LAMBDA_NAME,
            InvocationType: "Event", // Asynchronous invocation
            Payload: Buffer.from(JSON.stringify(payload)),
          })
        );
      })
    );

    client.release();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Successfully checked ${sites.length} sites. Found ${downSites.length} down.` }),
    };
  } catch (error) {
    console.error("Monitoring Lambda failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
