
// lambdas/checker-lambda.js

const FAKE_USER_AGENT = 'MCM Monitor Alerts';

// This is the public-facing checker lambda. It is NOT in the VPC.
exports.handler = async (event) => {
  const { url } = event;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "URL is required" }),
    };
  }

  const start = Date.now();
  let status_code = 0,
    is_up = false,
    response_time_ms = 0,
    status_text = '',
    error_message = null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': FAKE_USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    response_time_ms = Date.now() - start;
    status_code = response.status;
    status_text = response.statusText;
    is_up = response.ok; // status in the range 200-299

    if (!is_up) {
      error_message = `Server responded with status: ${status_code} ${status_text}`;
    }
  } catch (e) {
    response_time_ms = Date.now() - start;
    error_message = e.message;
    is_up = false;
  }

  return {
    is_up,
    response_time_ms,
    status_code,
    status_text,
    error_message,
  };
};
