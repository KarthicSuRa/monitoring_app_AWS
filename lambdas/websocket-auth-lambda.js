
const https = require('https');
const { createPublicKey, createVerify } = require('crypto');

const userPoolId = process.env.USER_POOL_ID;
const region = process.env.AWS_REGION;

if (!userPoolId || !region) {
    throw new Error('USER_POOL_ID and AWS_REGION environment variables must be set.');
}

const cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const jwksUrl = `${cognitoIssuer}/.well-known/jwks.json`;

let cachedKeys;

const getKeys = () => {
    return new Promise((resolve, reject) => {
        if (cachedKeys) {
            return resolve(cachedKeys);
        }
        https.get(jwksUrl, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const jwks = JSON.parse(rawData);
                    // Create a map of kid -> jwk
                    cachedKeys = jwks.keys.reduce((acc, key) => {
                        acc[key.kid] = key;
                        return acc;
                    }, {});
                    resolve(cachedKeys);
                } catch (e) {
                    reject(new Error(`Failed to parse JWKS: ${e.message}`));
                }
            });
        }).on('error', (e) => {
            reject(new Error(`Failed to fetch JWKS: ${e.message}`));
        });
    });
};

const verifyToken = async (token) => {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = tokenParts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    if (payload.iss !== cognitoIssuer) {
        throw new Error(`Token issuer mismatch. Expected ${cognitoIssuer}, but got ${payload.iss}`);
    }
    
    if (payload.token_use !== 'id') {
         throw new Error('Token is not an ID token');
    }

    if (Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
    }

    const keys = await getKeys();
    const jwk = keys[header.kid];
    if (!jwk) {
        throw new Error('Token key ID not found in JWKS');
    }
    
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    
    const verify = createVerify('RSA-SHA256');
    verify.update(`${headerB64}.${payloadB64}`);
    
    if (!verify.verify(publicKey, signatureB64, 'base64url')) {
        throw new Error('Token signature invalid');
    }
    
    return payload;
};

exports.handler = async (event) => {
    console.log('Authorizing WebSocket connection...');
    const token = event.queryStringParameters.token;

    if (!token) {
        console.log('No token found in query string.');
        return { statusCode: 401, body: 'Unauthorized' };
    }

    try {
        const payload = await verifyToken(token);
        const userId = payload.sub;
        console.log(`Successfully authenticated user: ${userId}`);

        return {
            principalId: userId,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Allow',
                        Resource: event.methodArn,
                    },
                ],
            },
        };
    } catch (error) {
        console.error('Authentication error:', error.message);
        return { statusCode: 401, body: 'Unauthorized' };
    }
};
