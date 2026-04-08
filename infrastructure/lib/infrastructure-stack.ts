
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Duration } from 'aws-cdk-lib';
import * as fs from 'fs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as crypto from 'crypto';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { createDynamoTables } from './dynamo-tables';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── DynamoDB Tables ──────────────────────────────────────────────────
    const tables = createDynamoTables(this);

    // ─── Cognito User Pool ────────────────────────────────────────────────
    const userPool = new cognito.UserPool(this, 'McmAlertsUserPool', {
      userPoolName: 'mcm-alerts-user-pool',
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'McmAlertsUserPoolClient', {
      userPool,
      generateSecret: false,
    });

    // ─── SNS Push Notification Topic ──────────────────────────────────────
    const pushNotificationTopic = new sns.Topic(this, 'McmPushNotificationTopic', {
      displayName: 'MCM Alerts Push Notification Topic',
    });

    // ─── SNS FCM Platform Application (Manually Created) ──────────────────
    const fcmPlatformApplicationArn = 'arn:aws:sns:ap-southeast-2:867958227307:app/GCM/testfcm';

    // ─── S3 + CloudFront ──────────────────────────────────────────────────
    const frontendBucket = new s3.Bucket(this, 'McmAlertsFrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'McmAlertsOriginAccessIdentity');
    frontendBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'McmAlertsFrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployMcmAlertsFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../client/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ─── REST API ─────────────────────────────────────────────────────────
    const restApiAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'McmAlertsRestApiAuthorizerV2', {
      cognitoUserPools: [userPool],
    });

    const api = new apigateway.RestApi(this, 'McmAlertsApi', {
      restApiName: 'MCM Alerts Service API',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000', `https://${distribution.distributionDomainName}`],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
        allowCredentials: true,
      },
      defaultMethodOptions: {
        authorizer: restApiAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });

    // ─── Lambda Common Props (NO VPC — DynamoDB accessed via internet/gateway endpoint) ─
    const lambdaCode = lambda.Code.fromAsset(path.join(__dirname, '../../lambdas'));

    // Build table name env vars map
    const tableEnvVars: Record<string, string> = {
      TABLE_USERS: tables.users.tableName,
      TABLE_TEAMS: tables.teams.tableName,
      TABLE_TEAM_MEMBERS: tables.teamMembers.tableName,
      TABLE_MONITORED_SITES: tables.monitoredSites.tableName,
      TABLE_PING_LOGS: tables.pingLogs.tableName,
      TABLE_SYNTHETIC_TESTS: tables.syntheticTests.tableName,
      TABLE_SYNTHETIC_STEPS: tables.syntheticSteps.tableName,
      TABLE_ALERT_RULES: tables.alertRules.tableName,
      TABLE_MAINTENANCE_WINDOWS: tables.maintenanceWindows.tableName,
      TABLE_SSL_CERTIFICATES: tables.sslCertificates.tableName,
      TABLE_HEARTBEAT_CHECKS: tables.heartbeatChecks.tableName,
      TABLE_NOTIFICATIONS: tables.notifications.tableName,
      TABLE_COMMENTS: tables.comments.tableName,
      TABLE_TOPICS: tables.topics.tableName,
      TABLE_TOPIC_SUBSCRIPTIONS: tables.topicSubscriptions.tableName,
      TABLE_WEBHOOK_SOURCES: tables.webhookSources.tableName,
      TABLE_WEBHOOK_EVENTS: tables.webhookEvents.tableName,
      TABLE_SFCC_ORDERS: tables.sfccOrders.tableName,
      TABLE_ORDERS: tables.orders.tableName,
      TABLE_PUSH_SUBSCRIPTIONS: tables.pushSubscriptions.tableName,
      TABLE_CALENDAR_EVENTS: tables.calendarEvents.tableName,
      TABLE_AUDIT_LOGS: tables.auditLogs.tableName,
      TABLE_WEBSOCKET_CONNECTIONS: tables.websocketConnections.tableName,
      TABLE_USER_PREFS: tables.userPrefs.tableName,
      TABLE_EMAILS: tables.emails.tableName,
    };

    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambdaCode,
      timeout: Duration.seconds(90),
      environment: {
        ...tableEnvVars,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    };

    // Helper to grant all DynamoDB table permissions to a Lambda
    const grantAllTables = (fn: lambda.Function) => {
      Object.values(tables).forEach((t) => t.grantReadWriteData(fn));
    };

    // ─── Auth Lambda ──────────────────────────────────────────────────────
    const authLambda = new lambda.Function(this, 'McmAuthLambda', {
      ...commonLambdaProps,
      handler: 'auth-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });
    authLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:SignUp', 'cognito-idp:AdminConfirmSignUp'],
      resources: [userPool.userPoolArn],
    }));
    grantAllTables(authLambda);

    // ─── DB Seed Lambda (replaces DB Init Lambda) ─────────────────────────
    const dbSeedLambda = new lambda.Function(this, 'DbSeedLambda', {
      ...commonLambdaProps,
      handler: 'dynamo-seed.handler',
      timeout: cdk.Duration.minutes(3),
    });
    grantAllTables(dbSeedLambda);

    const dbSeedProvider = new cr.Provider(this, 'DbSeedProvider', {
      onEventHandler: dbSeedLambda,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    // Hash seed data to re-run only when it changes
    const seedHash = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(__dirname, '../../lambdas/dynamo-seed.js'), 'utf8'))
      .digest('hex');

    new cdk.CustomResource(this, 'DbSeedCustomResource', {
      serviceToken: dbSeedProvider.serviceToken,
      properties: { seedHash },
    });

    // ─── WebSocket Auth Lambda ────────────────────────────────────────────
    const webSocketAuthLambda = new lambda.Function(this, 'McmWebSocketAuthLambda', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'websocket-auth-lambda.handler',
        code: lambdaCode,
        environment: { USER_POOL_ID: userPool.userPoolId },
    });

    // ─── WebSocket Handler Lambda ─────────────────────────────────────────
    const webSocketApi = new apigw2.WebSocketApi(this, 'McmAlertsWebSocketApi');
    const webSocketStage = new apigw2.WebSocketStage(this, 'McmAlertsWebSocketStage', {
        webSocketApi,
        stageName: 'prod',
        autoDeploy: true,
    });
    
    const webSocketMgmtUrl = cdk.Fn.sub('https://${apiId}.execute-api.${region}.amazonaws.com/${stage}', {
      apiId: webSocketApi.apiId,
      region: this.region,
      stage: webSocketStage.stageName,
    });

    const webSocketHandler = new lambda.Function(this, 'McmWebSocketLambda', {
        ...commonLambdaProps,
        handler: 'websocket-lambda.handler',
        environment: {
            ...commonLambdaProps.environment,
            WEBSOCKET_API_ENDPOINT: webSocketMgmtUrl,
        },
    });
    grantAllTables(webSocketHandler);
    webSocketHandler.addToRolePolicy(new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`],
    }));

    const webSocketAuthorizer = new WebSocketLambdaAuthorizer(
        'McmWebSocketAuthorizerV2',
        webSocketAuthLambda,
        { identitySource: ['route.request.querystring.token'] }
    );

    webSocketApi.addRoute('$connect', {
        integration: new WebSocketLambdaIntegration('ConnectIntegration', webSocketHandler),
        authorizer: webSocketAuthorizer,
    });
    webSocketApi.addRoute('$disconnect', {
        integration: new WebSocketLambdaIntegration('DisconnectIntegration', webSocketHandler),
    });
    webSocketApi.addRoute('$default', {
        integration: new WebSocketLambdaIntegration('DefaultIntegration', webSocketHandler),
    });
    webSocketApi.addRoute('ping', {
        integration: new WebSocketLambdaIntegration('PingIntegration', webSocketHandler),
    });

    // ─── Notification Lambda ──────────────────────────────────────────────
    const notificationLambda = new lambda.Function(this, 'McmNotificationLambda', {
      ...commonLambdaProps,
      handler: 'notification-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        SNS_TOPIC_ARN: pushNotificationTopic.topicArn,
        WEBSOCKET_API_ENDPOINT: webSocketMgmtUrl,
        SNS_PLATFORM_APPLICATION_ARN: fcmPlatformApplicationArn,
      },
    });
    pushNotificationTopic.grantPublish(notificationLambda);
    grantAllTables(notificationLambda);
    notificationLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`],
    }));
    // Grant permission to publish to any endpoint in the FCM platform application
    notificationLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: [
        fcmPlatformApplicationArn,
        `${fcmPlatformApplicationArn.replace(':app/', ':endpoint/')}/*`,
      ],
    }));


    // ─── Checker Lambda ───────────────────────────────────────────────────
    const checkerLambda = new lambda.Function(this, 'McmCheckerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'checker-lambda.handler',
      code: lambdaCode,
      timeout: Duration.seconds(20),
    });

    // ─── Monitoring Lambda ────────────────────────────────────────────────
    const monitoringLambda = new lambda.Function(this, 'McmMonitoringLambda', {
      ...commonLambdaProps,
      handler: 'monitoring-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        NOTIFICATION_LAMBDA_NAME: notificationLambda.functionName,
        CHECKER_LAMBDA_NAME: checkerLambda.functionName,
      },
    });
    grantAllTables(monitoringLambda);
    checkerLambda.grantInvoke(monitoringLambda);
    notificationLambda.grantInvoke(monitoringLambda);

    const monitoringRule = new events.Rule(this, 'McmMonitoringRule', {
      schedule: events.Schedule.expression('cron(0 */2 * * ? *)'),
    });
    monitoringRule.addTarget(new targets.LambdaFunction(monitoringLambda));

    // ─── SSL Check Lambda (daily) ─────────────────────────────────────────
    const sslCheckLambda = new lambda.Function(this, 'McmSslCheckLambda', {
      ...commonLambdaProps,
      handler: 'ssl-check-lambda.handler',
      timeout: Duration.minutes(5), // TLS handshakes can be slow for 39 sites
      environment: {
        ...commonLambdaProps.environment,
        NOTIFICATION_LAMBDA_NAME: notificationLambda.functionName,
      },
    });
    grantAllTables(sslCheckLambda);
    notificationLambda.grantInvoke(sslCheckLambda);

    // Run SSL checks once per day at 06:00 UTC
    const sslCheckRule = new events.Rule(this, 'McmSslCheckRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '6' }),
      description: 'Daily SSL certificate expiry check for all MCM sites',
    });
    sslCheckRule.addTarget(new targets.LambdaFunction(sslCheckLambda));


    // ─── Schedule Lambda ──────────────────────────────────────────────────
    const scheduleLambda = new lambda.Function(this, 'McmScheduleLambda', {
      ...commonLambdaProps,
      handler: 'schedule-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        RULE_NAME: monitoringRule.ruleName,
      },
    });
    scheduleLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['events:PutRule'],
      resources: [monitoringRule.ruleArn],
    }));

    // ─── API Lambda ───────────────────────────────────────────────────────
    const apiLambda = new lambda.Function(this, 'McmApiLambda', {
      ...commonLambdaProps,
      handler: 'api-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        SNS_TOPIC_ARN: pushNotificationTopic.topicArn,
        SNS_PLATFORM_APPLICATION_ARN: fcmPlatformApplicationArn,
      },
    });
    grantAllTables(apiLambda);
    apiLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'sns:CreatePlatformEndpoint',
        'sns:DeleteEndpoint',
        'sns:GetEndpointAttributes',
        'sns:SetEndpointAttributes',
        'sns:Subscribe',
        'sns:Unsubscribe',
      ],
      resources: [
        fcmPlatformApplicationArn,
        `${fcmPlatformApplicationArn.replace(':app/', ':endpoint/')}/*`,
        pushNotificationTopic.topicArn,
      ],
    }));

    // ─── API Lambda 2 ─────────────────────────────────────────────────────
    const apiLambda2 = new lambda.Function(this, 'McmApiLambda2', {
      ...commonLambdaProps,
      handler: 'api-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        SNS_TOPIC_ARN: pushNotificationTopic.topicArn,
        SNS_PLATFORM_APPLICATION_ARN: fcmPlatformApplicationArn,
      },
    });
    grantAllTables(apiLambda2);
    apiLambda2.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'sns:CreatePlatformEndpoint',
        'sns:DeleteEndpoint',
        'sns:GetEndpointAttributes',
        'sns:SetEndpointAttributes',
        'sns:Subscribe',
        'sns:Unsubscribe',
      ],
      resources: [
        fcmPlatformApplicationArn,
        `${fcmPlatformApplicationArn.replace(':app/', ':endpoint/')}/*`,
        pushNotificationTopic.topicArn,
      ],
    }));

    // ─── Orders API Lambda ────────────────────────────────────────────────
    const ordersApiLambda = new lambda.Function(this, 'McmOrdersApiLambda', {
      ...commonLambdaProps,
      handler: 'orders-api-lambda.handler',
    });
    grantAllTables(ordersApiLambda);

    // ─── SFCC Order Sync Lambda ───────────────────────────────────────────
    const sfccOrderSyncLambda = new lambda.Function(this, 'McmSfccOrderSyncLambda', {
      ...commonLambdaProps,
      handler: 'sfcc-order-sync.handler',
      timeout: Duration.minutes(5),
      environment: {
        ...commonLambdaProps.environment,
        REALM_1_BASE_URL: process.env.REALM_1_BASE_URL || '',
        REALM_1_CLIENT_ID: process.env.REALM_1_CLIENT_ID || '',
        REALM_1_CLIENT_SECRET: process.env.REALM_1_CLIENT_SECRET || '',
        REALM_2_BASE_URL: process.env.REALM_2_BASE_URL || '',
        REALM_2_CLIENT_ID: process.env.REALM_2_CLIENT_ID || '',
        REALM_2_CLIENT_SECRET: process.env.REALM_2_CLIENT_SECRET || '',
        REALM_3_BASE_URL: process.env.REALM_3_BASE_URL || '',
        REALM_3_CLIENT_ID: process.env.REALM_3_CLIENT_ID || '',
        REALM_3_CLIENT_SECRET: process.env.REALM_3_CLIENT_SECRET || '',
        SOM_ORDER_LAMBDA_NAME: '', // set below after creation
      },
    });
    grantAllTables(sfccOrderSyncLambda);

    // ─── SOM Order Details Lambda ─────────────────────────────────────────
    const somOrderDetailsLambda = new lambda.Function(this, 'McmSomOrderDetailsLambda', {
      ...commonLambdaProps,
      handler: 'som-order-details-lambda.handler',
      timeout: Duration.minutes(3),
      environment: {
        ...commonLambdaProps.environment,
        SALESFORCE_HOST: process.env.SALESFORCE_HOST || '',
        SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID || '',
        SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET || '',
      },
    });
    grantAllTables(somOrderDetailsLambda);
    somOrderDetailsLambda.grantInvoke(sfccOrderSyncLambda);

    // Patch env var after both exist
    sfccOrderSyncLambda.addEnvironment('SOM_ORDER_LAMBDA_NAME', somOrderDetailsLambda.functionName);

    // Schedule SFCC sync every 15 minutes
    const sfccSyncRule = new events.Rule(this, 'McmSfccSyncRule', {
      schedule: events.Schedule.rate(Duration.minutes(15)),
    });
    sfccSyncRule.addTarget(new targets.LambdaFunction(sfccOrderSyncLambda));

    // ─── Topic Subscribers Lambda ─────────────────────────────────────────
    const topicSubscribersLambda = new lambda.Function(this, 'TopicSubscribersLambda', {
      ...commonLambdaProps,
      handler: 'topic-subscribers-lambda.handler',
    });
    grantAllTables(topicSubscribersLambda);

    // ─── API Routes ───────────────────────────────────────────────────────
    const apiLambdaInt = new apigateway.LambdaIntegration(apiLambda);
    const apiLambda2Int = new apigateway.LambdaIntegration(apiLambda2);
    const notifLambdaInt = new apigateway.LambdaIntegration(notificationLambda);
    const ordersLambdaInt = new apigateway.LambdaIntegration(ordersApiLambda);
    const topicsSubLambdaInt = new apigateway.LambdaIntegration(topicSubscribersLambda);

    // /signup
    const signupResource = api.root.addResource('signup');
    signupResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // /users
    const users = api.root.addResource('users');
    users.addMethod('GET', apiLambda2Int);
    const userById = users.addResource('{userId}');
    userById.addMethod('GET', apiLambda2Int);
    userById.addMethod('PUT', apiLambda2Int);

    // /users/profile
    const userProfile = users.addResource('profile');
    userProfile.addMethod('GET', apiLambda2Int);
    userProfile.addMethod('PUT', apiLambda2Int);

    // /teams
    const teams = api.root.addResource('teams');
    teams.addMethod('GET', apiLambda2Int);

    // /sites
    const sites = api.root.addResource('sites');
    sites.addMethod('GET', apiLambdaInt);
    sites.addMethod('POST', apiLambdaInt);
    const siteById = sites.addResource('{siteId}');
    siteById.addMethod('GET', apiLambdaInt);
    siteById.addMethod('DELETE', apiLambdaInt);

    // /monitoring
    const monitoring = api.root.addResource('monitoring');
    monitoring.addMethod('GET', apiLambda2Int);
    monitoring.addResource('trigger').addMethod('POST', new apigateway.LambdaIntegration(monitoringLambda));
    monitoring.addResource('schedule').addMethod('PUT', new apigateway.LambdaIntegration(scheduleLambda));

    // /topics
    const topicsResource = api.root.addResource('topics');
    topicsResource.addMethod('GET', apiLambda2Int);
    topicsResource.addMethod('POST', apiLambda2Int);
    const topicById = topicsResource.addResource('{topicId}');
    topicById.addMethod('PUT', apiLambda2Int);
    topicById.addMethod('DELETE', apiLambda2Int);
    topicById.addResource('subscription').addMethod('POST', topicsSubLambdaInt);
    topicById.addResource('subscribers').addMethod('GET', topicsSubLambdaInt);

    // /notifications
    const notificationsResource = api.root.addResource('notifications');
    notificationsResource.addMethod('GET', notifLambdaInt);
    notificationsResource.addMethod('POST', notifLambdaInt, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    notificationsResource.addResource('test').addMethod('POST', notifLambdaInt);
    const notifById = notificationsResource.addResource('{notificationId}');
    notifById.addMethod('GET', notifLambdaInt);
    notifById.addMethod('PUT', notifLambdaInt);
    notifById.addResource('comments').addMethod('POST', notifLambdaInt);

    // /orders
    const ordersResource = api.root.addResource('orders');
    ordersResource.addMethod('GET', ordersLambdaInt);
    const orderById = ordersResource.addResource('{orderNo}');
    orderById.addMethod('GET', ordersLambdaInt);
    orderById.addMethod('PUT', ordersLambdaInt); // manual fulfillment update

    // /webhooks
    const webhooks = api.root.addResource('webhooks');
    webhooks.addMethod('GET', apiLambda2Int);
    webhooks.addMethod('POST', apiLambda2Int);
    webhooks.addResource('trigger').addResource('{id}').addMethod('POST', apiLambda2Int, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // /calendar
    const calendar = api.root.addResource('calendar');
    calendar.addMethod('GET', apiLambdaInt);
    calendar.addMethod('POST', apiLambdaInt);

    // /audit-logs
    api.root.addResource('audit-logs').addMethod('GET', apiLambdaInt);

    // /emails
    api.root.addResource('emails').addMethod('GET', apiLambda2Int);

    // /push-subscriptions
    const pushSubs = api.root.addResource('push-subscriptions');
    pushSubs.addMethod('POST', apiLambda2Int);
    pushSubs.addMethod('DELETE', apiLambda2Int);

    // ─── Outputs ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'McmAlertsCloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront URL',
    });
    new cdk.CfnOutput(this, 'McmAlertsApiGatewayUrl', {
      value: api.url,
      description: 'REST API Gateway URL',
    });
    new cdk.CfnOutput(this, 'McmAlertsWebSocketApiUrl', {
      value: webSocketStage.url,
      description: 'WebSocket API URL',
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'SnsTopicArn', {
      value: pushNotificationTopic.topicArn,
      description: 'SNS Push Notification Topic ARN',
    });
    new cdk.CfnOutput(this, 'SnsPlatformApplicationArn', {
      value: fcmPlatformApplicationArn,
      description: 'SNS FCM Platform Application ARN',
    });
    new cdk.CfnOutput(this, 'McmAlertsCloudFrontDistributionId', {
      value: distribution.distributionId,
    });
  }
}
