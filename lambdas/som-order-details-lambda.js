// AWS Lambda - SOM Order Details
// Runtime: Node.js 20+

export const handler = async (event) => {
  try {
    const body = parseBody(event);

    const { orderId, trackingNumber, orderQueryTimeString } = body;

    if (!orderId && !trackingNumber && !orderQueryTimeString) {
      return response(400, {
        error: "Provide orderId, trackingNumber, or orderQueryTimeString",
      });
    }

    const {
      SALESFORCE_HOST,
      SALESFORCE_CLIENT_ID,
      SALESFORCE_CLIENT_SECRET,
    } = process.env;

    if (!SALESFORCE_HOST || !SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET) {
      return response(500, {
        error: "Missing Salesforce environment variables",
      });
    }

    // ───────────────────────────────────────────────
    // 1️⃣ Get Salesforce Access Token
    // ───────────────────────────────────────────────

    const tokenResponse = await fetch(
      `https://${SALESFORCE_HOST}/services/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: SALESFORCE_CLIENT_ID,
          client_secret: SALESFORCE_CLIENT_SECRET,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return response(500, {
        error: "Salesforce token request failed",
        details: errorText,
      });
    }

    const { access_token } = await tokenResponse.json();

    // ───────────────────────────────────────────────
    // 2️⃣ Build FULL SOQL Query (Shipping + Payments + Tracking)
    // ───────────────────────────────────────────────

    const baseSoql = `
      SELECT 
        Id,
        OrderNumber,
        Status,
        GrandTotalAmount,
        OrderedDate,
        LastModifiedDate,
        CurrencyIsoCode,
        BillingAddress.CountryCode,
        BillingAddress.Street,

        (SELECT 
            Id,
            Amount,
            Method,
            FM_PaymentMethod__c,
            PaymentGateway_SFCC__c,
            PaymentMethodId
         FROM OrderPaymentSummaries),

        (SELECT
            Id,
            Status,
            FulfilledFromLocation.Name,
            CreatedDate,
            (SELECT
                Id,
                Status,
                TrackingNumber,
                Carrier,
                ShipmentDate,
                DeliveredDate
             FROM Shipments)
         FROM FulfillmentOrders)

      FROM OrderSummary
    `;

    let whereClause = "";

    if (orderId) {
      whereClause = `WHERE OrderNumber = '${escapeSoql(orderId)}'`;
    } 
    else if (trackingNumber) {
      whereClause = `
        WHERE Id IN (
          SELECT OrderSummaryId
          FROM FulfillmentOrder
          WHERE Id IN (
            SELECT FulfillmentOrderId
            FROM Shipment
            WHERE TrackingNumber = '${escapeSoql(trackingNumber)}'
          )
        )
      `;
    } 
    else if (orderQueryTimeString) {
      const iso = new Date(orderQueryTimeString).toISOString();
      whereClause = `WHERE LastModifiedDate > ${iso}`;
    }

    const finalQuery = `${baseSoql} ${whereClause} LIMIT 100`;

    // ───────────────────────────────────────────────
    // 3️⃣ Execute Composite Query
    // ───────────────────────────────────────────────

    const sfResponse = await fetch(
      `https://${SALESFORCE_HOST}/services/data/v60.0/composite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          compositeRequest: [
            {
              method: "GET",
              url: `/services/data/v60.0/query/?q=${encodeURIComponent(finalQuery)}`,
              referenceId: "orderQuery",
            },
          ],
        }),
      }
    );

    if (!sfResponse.ok) {
      const errorText = await sfResponse.text();
      return response(500, {
        error: "Salesforce query failed",
        details: errorText,
      });
    }

    const sfJson = await sfResponse.json();
    const records =
      sfJson.compositeResponse?.[0]?.body?.records || [];

    return response(200, {
      success: true,
      total: records.length,
      records,
    });

  } catch (err) {
    return response(500, {
      error: err.message,
      stack: err.stack,
    });
  }
};

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function parseBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === "string"
      ? JSON.parse(event.body)
      : event.body;
  } catch {
    return {};
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function escapeSoql(value) {
  return String(value).replace(/'/g, "\\'");
}