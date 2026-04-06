const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    console.log('DB schema initialization event:', JSON.stringify(event));

    if (event.RequestType === 'Delete') {
        console.log('Delete event received, no action needed. Sending success response.');
        const response = {
            Status: 'SUCCESS',
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            StackId: event.StackId,
            PhysicalResourceId: event.PhysicalResourceId || `db-init-${event.LogicalResourceId}`,
        };
        await sendResponse(event.ResponseURL, response);
        return;
    }

    console.log('Create or Update event received, initializing schema...');

    const {
        DB_HOST,
        DB_PORT,
        DB_USER,
        DB_PASSWORD,
        DB_NAME,
    } = process.env;

    if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
        const error = new Error('FATAL: Missing required environment variables for DB initialization.');
        const response = {
            Status: 'FAILED',
            Reason: error.message,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            StackId: event.StackId,
            PhysicalResourceId: event.PhysicalResourceId || `db-init-${event.LogicalResourceId}`,
        };
        await sendResponse(event.ResponseURL, response);
        throw error;
    }

    const sqlScript = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');

    const client = new Client({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        ssl: { rejectUnauthorized: false }, // Required for RDS IAM auth, adjust as needed
        connectionTimeoutMillis: 15000,
    });

    try {
        await client.connect();
        console.log('Database connection successful. Executing SQL script...');
        await client.query(sqlScript);
        console.log('SQL script executed successfully.');

        const response = {
            Status: 'SUCCESS',
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            StackId: event.StackId,
            PhysicalResourceId: event.PhysicalResourceId || `db-init-${event.LogicalResourceId}`,
        };
        await sendResponse(event.ResponseURL, response);

    } catch (error) {
        console.error('FATAL: Error during database schema initialization:', error);
        const response = {
            Status: 'FAILED',
            Reason: error.message,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            StackId: event.StackId,
            PhysicalResourceId: event.PhysicalResourceId || `db-init-${event.LogicalResourceId}`,
        };
        await sendResponse(event.ResponseURL, response);
        throw error;
    } finally {
        if (client) {
            await client.end();
            console.log('Database client disconnected.');
        }
    }
};

async function sendResponse(responseUrl, responseBody) {
    const https = require('https');
    const url = new URL(responseUrl);

    const requestOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
            'Content-Type': '',
            'Content-Length': Buffer.byteLength(JSON.stringify(responseBody)),
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(requestOptions, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                console.log('Sent CloudFormation response:', responseData);
                resolve(responseData);
            });
        });

        req.on('error', (error) => {
            console.error('sendResponse Error:', error);
            reject(error);
        });

        req.write(JSON.stringify(responseBody));
        req.end();
    });
}