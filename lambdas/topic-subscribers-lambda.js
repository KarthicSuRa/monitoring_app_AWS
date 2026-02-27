import { Pool } from "pg";

/* ===============================
   DB Connection (RDS PostgreSQL)
=============================== */

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // required for RDS
  },
});

/* ===============================
   CORS
=============================== */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

/* ===============================
   Lambda Handler
=============================== */

export const handler = async (event) => {
  try {
    const method =
      event.requestContext?.http?.method ||
      event.httpMethod ||
      "POST";

    if (method === "OPTIONS") {
      return jsonResponse(200, { message: "ok" });
    }

    if (method !== "POST") {
      return jsonResponse(405, {
        error: "Method not allowed",
      });
    }

    const body = JSON.parse(event.body || "{}");
    const { topic_id } = body;

    if (!topic_id) {
      return jsonResponse(400, {
        error: "`topic_id` is required.",
      });
    }

    /* ===============================
       Single Optimized SQL Join
    =============================== */

    const query = `
      SELECT p.id, p.full_name, p.email
      FROM topic_subscriptions ts
      JOIN profiles p ON p.id = ts.user_id
      WHERE ts.topic_id = $1
    `;

    const { rows } = await pool.query(query, [topic_id]);

    return jsonResponse(200, rows);

  } catch (error) {
    console.error("Lambda error:", error);

    return jsonResponse(500, {
      error: "Internal server error",
      message: error.message,
    });
  }
};