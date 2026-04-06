/**
 * websocket-lambda.js  (DynamoDB rewrite)
 */
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { TABLES, now, ttlDays, putItem, deleteItem } = require('./dynamo-client');

let apiGw;
function getApiGw() {
  if (!apiGw) {
    apiGw = new ApiGatewayManagementApiClient({
      endpoint: process.env.WEBSOCKET_API_ENDPOINT,
    });
  }
  return apiGw;
}

exports.handler = async (event) => {
  const { requestContext: { connectionId, routeKey, authorizer } } = event;
  const userId = authorizer?.principalId || null;
  const body = event.body;

  try {
    switch (routeKey) {
      case '$connect':
        if (!userId) {
          console.warn('Rejected unauthenticated WebSocket connection');
          return { statusCode: 401, body: 'Unauthorized' };
        }
        await putItem(TABLES.WEBSOCKET_CONNECTIONS, {
          connection_id: connectionId,
          user_id: userId,
          created_at: now(),
          ttl: ttlDays(1), // auto-expire stale connections after 24h
        });
        console.log(`WS Connect: ${connectionId}, user: ${userId}`);
        break;

      case '$disconnect':
        await deleteItem(TABLES.WEBSOCKET_CONNECTIONS, { connection_id: connectionId });
        console.log(`WS Disconnect: ${connectionId}`);
        break;

      case 'ping':
        await getApiGw().send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify({ type: 'pong', timestamp: now() })),
        }));
        break;

      case '$default':
        try {
          await getApiGw().send(new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify({ type: 'echo', data: body })),
          }));
        } catch (e) {
          console.error('Error posting to WS connection:', e.message);
        }
        break;

      default:
        console.log(`Unknown WS route: ${routeKey}`);
    }
  } catch (err) {
    console.error('WebSocket Lambda error:', err.message, err.stack);
    return { statusCode: 500, body: 'Internal Server Error' };
  }

  return { statusCode: 200, body: 'Ok' };
};
