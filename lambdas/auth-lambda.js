const { CognitoIdentityProviderClient, SignUpCommand, AdminConfirmSignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({});

const getCorsHeaders = (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  // Fallback to localhost for development, but prioritize the deployed CloudFront URL
  const allowedOrigins = [process.env.CLOUDFRONT_URL, 'http://localhost:3000'].filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }
  return {}; // Disallow if origin is not in the list
};


exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  const jsonResponse = (statusCode, body, headers = {}) => ({
    statusCode,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (!corsHeaders['Access-Control-Allow-Origin']) {
    console.warn(`CORS check failed for signup. Origin "${event.headers.origin || event.headers.Origin}" is not allowed.`);
    return jsonResponse(403, { error: "CORS error: Origin not allowed" });
  }

  const { email, password } = JSON.parse(event.body);
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!email || !password || !userPoolId || !clientId) {
    return jsonResponse(400, { error: "Missing required parameters" });
  }

  try {
    const signUpParams = {
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    };
    await cognitoClient.send(new SignUpCommand(signUpParams));

    const confirmParams = {
      UserPoolId: userPoolId,
      Username: email,
    };
    await cognitoClient.send(new AdminConfirmSignUpCommand(confirmParams));

    return jsonResponse(200, { message: "User signed up and confirmed successfully" });

  } catch (error) {
    console.error("Error signing up user:", error.message);
    // Ensure the error message is a string
    const errorMessage = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, { error: `Failed to sign up: ${errorMessage}` });
  }
};