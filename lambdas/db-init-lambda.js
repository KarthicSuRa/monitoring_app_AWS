const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    console.log('DB schema initialization event:', JSON.stringify(event));

    // The CDK custom resource provider will handle sending success/failure signals.
    // We just need to perform the task or throw an error.
    if (event.RequestType === 'Delete') {
        console.log('Delete event received, no action needed.');
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
        throw new Error('FATAL: Missing required environment variables for DB initialization.');
    }

    const sqlScript = fs.readFileSync(path.resolve('schema.sql'), 'utf8');

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
    } catch (error) {
        console.error('FATAL: Error during database schema initialization:', error);
        throw error;
    } finally {
        if (client) {
            await client.end();
            console.log('Database client disconnected.');
        }
    }
};
