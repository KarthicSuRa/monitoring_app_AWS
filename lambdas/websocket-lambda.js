const { Pool } = require('pg');
const AWS = require('aws-sdk');

const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.WEBSOCKET_API_ENDPOINT,
});

const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

exports.handler = async (event) => {
  const { body, requestContext: { connectionId, routeKey, authorizer } } = event;
  const userId = authorizer ? authorizer.principalId : null;

  let dbClient;
  try {
    dbClient = await dbPool.connect();

    switch (routeKey) {
      case '$connect':
        console.log(`WebSocket Connect: ${connectionId}, User: ${userId}`);
        if (!userId) {
          console.log('Unauthorized connection, rejecting.');
          return { statusCode: 401, body: 'Unauthorized' };
        }
        await dbClient.query(
          'INSERT INTO public.websocket_connections (connection_id, user_id) VALUES ($1, $2)',
          [connectionId, userId]
        );
        break;

      case '$disconnect':
        console.log(`WebSocket Disconnect: ${connectionId}`);
        await dbClient.query(
          'DELETE FROM public.websocket_connections WHERE connection_id = $1',
          [connectionId]
        );
        break;

      case '$default':
        console.log(`WebSocket Default Route: ${connectionId}, Body: ${body}`);
        try {
          await apiGatewayManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: `You sent: ${body}`,
          }).promise();
        } catch (e) {
          console.error('Error posting to connection:', e);
        }
        break;

      case 'ping':
        await apiGatewayManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: 'pong',
        }).promise();
        break;

      default:
        console.log(`Unknown WebSocket Route: ${routeKey}`);
    }
  } catch (error) {
    console.error('Database or WebSocket error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }

  return { statusCode: 200, body: 'Ok' };
};
