import { Pool } from "pg";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Database connection pool, initialized lazily.
let pool;

// AWS Lambda Client
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

/**
 * Initializes the database connection pool using the DATABASE_URL environment variable.
 */
function initializePool() {
  if (pool) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Adjust as required
  });
}

/**
 * Saves the results of a synthetic test run to the database.
 */
async function saveTestResult(client, result) {
  // 1. Insert the main test record
  const testInsertResult = await client.query(
    `INSERT INTO synthetic_tests (site_id, status, error_message, total_duration_ms)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [result.site_id, result.status, result.error, result.total_duration_ms]
  );
  const testId = testInsertResult.rows[0].id;

  // 2. Bulk insert all the step records
  if (result.steps.length > 0) {
    const stepQuery = `
      INSERT INTO synthetic_test_steps (test_id, step_name, status, duration_ms, error_message)
      VALUES ${result.steps.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(",")}
    `;
    const stepValues = result.steps.flatMap(s => [testId, s.step, s.status, s.duration, s.error || null]);
    await client.query(stepQuery, stepValues);
  }
  
  return testId;
}

/**
 * Triggers a notification for a failed synthetic test.
 */
async function triggerFailureNotification(site, result) {
  const payload = {
    title: `Synthetic Test Failed: ${site.name}`,
    message: `The synthetic user journey for "${site.name}" failed at step: "${result.failed_step}".\nError: ${result.error}`,
    severity: "high",
    type: "synthetic_test",
    topic_name: "Synthetic Tests",
    metadata: {
      site_id: site.id,
      site_name: site.name,
      test_error: result.error,
      failed_step: result.failed_step,
    }
  };

  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: process.env.NOTIFICATION_LAMBDA_NAME,
      InvocationType: "Event", // Async
      Payload: Buffer.from(JSON.stringify(payload)),
    })
  );
}

// --- Main Handler ---
export const handler = async (event) => {
  if (!event?.sites || !Array.isArray(event.sites)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing sites array in payload" }) };
  }

  initializePool();
  const config = {
    loginPath: "/login",
    searchTerm: "backpack",
    selectors: { /* ... selectors ... */ },
    credentials: { email: process.env.SYNTHETIC_EMAIL, password: process.env.SYNTHETIC_PASSWORD },
  };

  let browser = null;
  const allResults = [];

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const dbClient = await pool.connect();

    try {
      for (const site of event.sites) {
        const testStartTime = Date.now();
        const siteResult = {
          site_id: site.id,
          status: "success",
          steps: [],
          error: null,
          failed_step: null,
        };

        const page = await browser.newPage();

        try {
          const step = async (label, fn) => {
            const start = Date.now();
            try {
              await fn();
              const duration = Date.now() - start;
              siteResult.steps.push({ step: label, status: "success", duration });
            } catch (stepError) {
              const duration = Date.now() - start;
              siteResult.steps.push({ step: label, status: "failed", duration, error: stepError.message });
              throw stepError; // Propagate error to stop the test
            }
          };

          // --- User Journey Steps ---
          await step("homepage", async () => { /* ... implementation ... */ });
          await step("login", async () => { /* ... implementation ... */ });
          await step("search", async () => { /* ... implementation ... */ });
          await step("open_product", async () => { /* ... implementation ... */ });
          await step("add_to_cart", async () => { /* ... implementation ... */ });
          await step("checkout_page", async () => { /* ... implementation ... */ });

        } catch (error) {
          siteResult.status = "failed";
          siteResult.error = error.message;
          siteResult.failed_step = siteResult.steps.find(s => s.status === 'failed')?.step || 'unknown';
          console.error(`✗ Test for ${site.name} FAILED at step '${siteResult.failed_step}': ${error.message}`);
          await triggerFailureNotification(site, siteResult);
        } finally {
          await page.close();
        }

        siteResult.total_duration_ms = Date.now() - testStartTime;
        await saveTestResult(dbClient, siteResult);
        allResults.push(siteResult);
      }
    } finally {
      dbClient.release();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, results: allResults }),
    };

  } catch (error) {
    console.error("Fatal synthetic monitoring error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Synthetic monitoring crashed", message: error.message }),
    };
  } finally {
    if (browser) await browser.close();
  }
};
