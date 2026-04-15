
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
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { createDynamoTables } from './dynamo-tables';

const resourceName = (project: string, environment: string, resourceType: string, name: string) =>
  `${project}-${environment}-${resourceType}-${name}`;

interface InfrastructureStackProps extends cdk.StackProps {
  environment: string;
}

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: InfrastructureStackProps) {
    super(scope, id, props);

    if (!props?.environment) {
      throw new Error('Stack props must include an "environment" property.');
    }

    const project = 'ecom-monitor';
    const { environment } = props;

    // --- SSM PARAMETER STORE: Define secure placeholders for secrets ---
    const sfccRealm1Param = new ssm.StringParameter(this, 'SfccRealm1Param', {
        parameterName: `/ecom-monitor/${environment}/sfcc/realm1-credentials`,
        description: 'SFCC Business Manager credentials for Realm 1 as a JSON object',
        stringValue: '{"base_url":"","client_id":"","client_secret":""}', // IMPORTANT: Update value in AWS Console
        type: ssm.ParameterType.SECURE_STRING,
    });

    const sfccRealm2Param = new ssm.StringParameter(this, 'SfccRealm2Param', {
        parameterName: `/ecom-monitor/${environment}/sfcc/realm2-credentials`,
        description: 'SFCC Business Manager credentials for Realm 2 as a JSON object',
        stringValue: '{"base_url":"","client_id":"","client_secret":""}',
        type: ssm.ParameterType.SECURE_STRING,
    });

    const sfccRealm3Param = new ssm.StringParameter(this, 'SfccRealm3Param', {
        parameterName: `/ecom-monitor/${environment}/sfcc/realm3-credentials`,
        description: 'SFCC Business Manager credentials for Realm 3 as a JSON object',
        stringValue: '{"base_url":"","client_id":"","client_secret":""}',
        type: ssm.ParameterType.SECURE_STRING,
    });

    const salesforceParam = new ssm.StringParameter(this, 'SalesforceParam', {
        parameterName: `/ecom-monitor/${environment}/salesforce/som-credentials`,
        description: 'Salesforce SOM API credentials as a JSON object',
        stringValue: '{"host":"","client_id":"","client_secret":""}',
        type: ssm.ParameterType.SECURE_STRING,
    });

    const tables = createDynamoTables(this, project, environment);

    const userPool = new cognito.UserPool(this, 'McmAlertsUserPool', {
      userPoolName: resourceName(project, environment, 'cognito-user-pool', 'main'),
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: { emailStyle: cognito.VerificationEmailStyle.CODE },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: false } },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'McmAlertsUserPoolClient', {
      userPool,
      userPoolClientName: resourceName(project, environment, 'cognito-user-pool-client', 'main'),
      generateSecret: false,
    });

    const pushNotificationTopic = new sns.Topic(this, 'McmPushNotificationTopic', {
      topicName: resourceName(project, environment, 'sns-topic', 'push-notifications'),
      displayName: 'MCM Alerts Push Notification Topic',
    });

    const fcmPlatformApplicationArn = 'arn:aws:sns:ap-southeast-2:867958227307:app/GCM/testfcm';

    // --- S3 Bucket: Create with environment-specific names ---
    const bucketName = environment === 'prod'
        ? 'ecommonitoring.mcmworldwide.com'
        : `ecommonitoring-${environment}.mcmworldwide.com`;

    const frontendBucket = new s3.Bucket(this, 'McmAlertsFrontendBucket', {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For production, consider cdk.RemovalPolicy.RETAIN
      autoDeleteObjects: true, // For production, set this to false
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // --- OAC: Create the Origin Access Control ---
    const oac = new cloudfront.CfnOriginAccessControl(this, 'McmAlertsOAC', {
        originAccessControlConfig: {
            name: resourceName(project, environment, 'oac', 'frontend'),
            originAccessControlOriginType: 's3',
            signingBehavior: 'always',
            signingProtocol: 'sigv4',
        },
    });

    const distribution = new cloudfront.Distribution(this, 'McmAlertsFrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket), // OAC is attached at L1 level below
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // --- OAC CONFIGURATION: Get the L1 CloudFront construct to attach the OAC ---
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    // Remove the legacy OAI property if it exists
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '');
    // Attach the OAC
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', oac.attrId);

    // --- S3 POLICY: Grant CloudFront access to the bucket via the OAC ---
    frontendBucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [frontendBucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
            StringEquals: {
                'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
            },
        },
    }));

    new s3deploy.BucketDeployment(this, 'DeployMcmAlertsFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../client/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    const restApiAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'McmAlertsRestApiAuthorizerV2', {
      cognitoUserPools: [userPool],
    });

    const api = new apigateway.RestApi(this, 'McmAlertsApi', {
      restApiName: resourceName(project, environment, 'api-gateway', 'main'),
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

    const lambdaCode = lambda.Code.fromAsset(path.join(__dirname, '../../lambdas'));

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

    const grantAllTables = (fn: lambda.Function) => {
      Object.values(tables).forEach((t) => t.grantReadWriteData(fn));
    };

    const authLambda = new lambda.Function(this, 'McmAuthLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'auth'),
        handler: 'auth-lambda.handler',
      });
      authLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: ['cognito-idp:SignUp', 'cognito-idp:AdminConfirmSignUp'],
        resources: [userPool.userPoolArn],
      }));
      grantAllTables(authLambda);
  
    const dbSeedLambda = new lambda.Function(this, 'DbSeedLambda', {
          ...commonLambdaProps,
          functionName: resourceName(project, environment, 'lambda', 'db-seed'),
          handler: 'dynamo-seed.handler',
          timeout: cdk.Duration.minutes(3),
      });
    grantAllTables(dbSeedLambda);
    const dbSeedProvider = new cr.Provider(this, 'DbSeedProvider', {
          onEventHandler: dbSeedLambda,
          logRetention: logs.RetentionDays.ONE_DAY,
      });
    const seedHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../../lambdas/dynamo-seed.js'), 'utf8')).digest('hex');
    new cdk.CustomResource(this, 'DbSeedCustomResource', {
          serviceToken: dbSeedProvider.serviceToken,
          properties: { seedHash },
      });
  
    const webSocketAuthLambda = new lambda.Function(this, 'McmWebSocketAuthLambda', {
          runtime: lambda.Runtime.NODEJS_20_X,
          functionName: resourceName(project, environment, 'lambda', 'ws-auth'),
          handler: 'websocket-auth-lambda.handler',
          code: lambdaCode,
          environment: { USER_POOL_ID: userPool.userPoolId },
      });
  
    const webSocketApi = new apigw2.WebSocketApi(this, 'McmAlertsWebSocketApi', {
        apiName: resourceName(project, environment, 'ws-api', 'main'),
      });
    const webSocketStage = new apigw2.WebSocketStage(this, 'McmAlertsWebSocketStage', {
          webSocketApi,
          stageName: environment,
          autoDeploy: true,
      });
      
    const webSocketMgmtUrl = cdk.Fn.sub('https://management.execute-api.${this.region}.amazonaws.com/${stage}', {
          stage: webSocketStage.stageName,
      });
  
    const webSocketHandler = new lambda.Function(this, 'McmWebSocketLambda', {
          ...commonLambdaProps,
          functionName: resourceName(project, environment, 'lambda', 'ws-handler'),
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
  
    const webSocketAuthorizer = new WebSocketLambdaAuthorizer('McmWebSocketAuthorizerV2', webSocketAuthLambda, { identitySource: ['route.request.querystring.token'] });
  
    webSocketApi.addRoute('$connect', { integration: new WebSocketLambdaIntegration('ConnectIntegration', webSocketHandler), authorizer: webSocketAuthorizer });
    webSocketApi.addRoute('$disconnect', { integration: new WebSocketLambdaIntegration('DisconnectIntegration', webSocketHandler) });
    webSocketApi.addRoute('$default', { integration: new WebSocketLambdaIntegration('DefaultIntegration', webSocketHandler) });
    webSocketApi.addRoute('ping', { integration: new WebSocketLambdaIntegration('PingIntegration', webSocketHandler) });
  
    const notificationLambda = new lambda.Function(this, 'McmNotificationLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'notification'),
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
    notificationLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: ['sns:Publish'],
        resources: [
          fcmPlatformApplicationArn,
          `${fcmPlatformApplicationArn.replace(':app/', ':endpoint/')}/*`,
        ],
      }));
  
    const checkerLambda = new lambda.Function(this, 'McmCheckerLambda', {
        runtime: lambda.Runtime.NODEJS_20_X,
        functionName: resourceName(project, environment, 'lambda', 'checker'),
        handler: 'checker-lambda.handler',
        code: lambdaCode,
        timeout: Duration.seconds(20),
      });
  
    const monitoringLambda = new lambda.Function(this, 'McmMonitoringLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'monitoring'),
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
        ruleName: resourceName(project, environment, 'event-rule', 'monitoring'),
        schedule: events.Schedule.expression('cron(0 */2 * * ? *)'),
      });
    monitoringRule.addTarget(new targets.LambdaFunction(monitoringLambda));
  
    const sslCheckLambda = new lambda.Function(this, 'McmSslCheckLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'ssl-check'),
        handler: 'ssl-check-lambda.handler',
        timeout: Duration.minutes(5),
        environment: {
          ...commonLambdaProps.environment,
          NOTIFICATION_LAMBDA_NAME: notificationLambda.functionName,
        },
      });
    grantAllTables(sslCheckLambda);
    notificationLambda.grantInvoke(sslCheckLambda);
  
    const sslCheckRule = new events.Rule(this, 'McmSslCheckRule', {
        ruleName: resourceName(project, environment, 'event-rule', 'ssl-check'),
        schedule: events.Schedule.cron({ minute: '0', hour: '6' }),
        description: 'Daily SSL certificate expiry check for all MCM sites',
      });
    sslCheckRule.addTarget(new targets.LambdaFunction(sslCheckLambda));
  
    const scheduleLambda = new lambda.Function(this, 'McmScheduleLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'schedule'),
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
  
    const apiLambda = new lambda.Function(this, 'McmApiLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'api'),
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
  
    const ordersApiLambda = new lambda.Function(this, 'McmOrdersApiLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'orders-api'),
        handler: 'orders-api-lambda.handler',
      });
    grantAllTables(ordersApiLambda);

    // --- LAMBDAS WITH SECRETS ---
    const somOrderDetailsLambda = new lambda.Function(this, 'McmSomOrderDetailsLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'som-order-details'),
        handler: 'som-order-details-lambda.handler',
        timeout: Duration.minutes(3),
        environment: {
            ...commonLambdaProps.environment,
            // Pass the NAME of the SSM parameter, not the secret itself
            PARAM_SALESFORCE_CREDS: salesforceParam.parameterName,
        },
    });
    grantAllTables(somOrderDetailsLambda);
    // Grant the Lambda permission to READ the parameter
    salesforceParam.grantRead(somOrderDetailsLambda);

    const sfccOrderSyncLambda = new lambda.Function(this, 'McmSfccOrderSyncLambda', {
        ...commonLambdaProps,
        functionName: resourceName(project, environment, 'lambda', 'sfcc-order-sync'),
        handler: 'sfcc-order-sync.handler',
        timeout: Duration.minutes(5),
        environment: {
            ...commonLambdaProps.environment,
            // Pass the NAMES of the SSM parameters
            PARAM_REALM_1_CREDS: sfccRealm1Param.parameterName,
            PARAM_REALM_2_CREDS: sfccRealm2Param.parameterName,
            PARAM_REALM_3_CREDS: sfccRealm3Param.parameterName,
            SOM_ORDER_LAMBDA_NAME: somOrderDetailsLambda.functionName,
        },
    });
    grantAllTables(sfccOrderSyncLambda);
    // Grant the Lambda permission to READ the parameters
    sfccRealm1Param.grantRead(sfccOrderSyncLambda);
    sfccRealm2Param.grantRead(sfccOrderSyncLambda);
    sfccRealm3Param.grantRead(sfccOrderSyncLambda);
    somOrderDetailsLambda.grantInvoke(sfccOrderSyncLambda);

    const sfccSyncRule = new events.Rule(this, 'McmSfccSyncRule', {
      ruleName: resourceName(project, environment, 'event-rule', 'sfcc-sync'),
      schedule: events.Schedule.rate(Duration.minutes(15)),
    });
    sfccSyncRule.addTarget(new targets.LambdaFunction(sfccOrderSyncLambda));

    const topicSubscribersLambda = new lambda.Function(this, 'TopicSubscribersLambda', {
      ...commonLambdaProps,
      functionName: resourceName(project, environment, 'lambda', 'topic-subscribers'),
      handler: 'topic-subscribers-lambda.handler',
    });
    grantAllTables(topicSubscribersLambda);

    // --- API GATEWAY ENDPOINTS (Corrected) ---
    const apiLambdaInt = new apigateway.LambdaIntegration(apiLambda);
    const notifLambdaInt = new apigateway.LambdaIntegration(notificationLambda);
    const ordersLambdaInt = new apigateway.LambdaIntegration(ordersApiLambda);
    const topicsSubLambdaInt = new apigateway.LambdaIntegration(topicSubscribersLambda);

    api.root.addResource('signup').addMethod('POST', new apigateway.LambdaIntegration(authLambda), { authorizationType: apigateway.AuthorizationType.NONE });
    const users = api.root.addResource('users');
    users.addMethod('GET', apiLambdaInt);
    const userById = users.addResource('{userId}');
    userById.addMethod('GET', apiLambdaInt);
    userById.addMethod('PUT', apiLambdaInt);
    const userProfile = users.addResource('profile');
    userProfile.addMethod('GET', apiLambdaInt);
    userProfile.addMethod('PUT', apiLambdaInt);
    api.root.addResource('teams').addMethod('GET', apiLambdaInt);
    const sites = api.root.addResource('sites');
    sites.addMethod('GET', apiLambdaInt);
    sites.addMethod('POST', apiLambdaInt);
    const siteById = sites.addResource('{siteId}');
    siteById.addMethod('GET', apiLambdaInt);
    siteById.addMethod('DELETE', apiLambdaInt);
    const monitoring = api.root.addResource('monitoring');
    monitoring.addMethod('GET', apiLambdaInt);
    monitoring.addResource('trigger').addMethod('POST', new apigateway.LambdaIntegration(monitoringLambda));
    monitoring.addResource('schedule').addMethod('PUT', new apigateway.LambdaIntegration(scheduleLambda));
    const topicsResource = api.root.addResource('topics');
    topicsResource.addMethod('GET', apiLambdaInt);
    topicsResource.addMethod('POST', apiLambdaInt);
    const topicById = topicsResource.addResource('{topicId}');
    topicById.addMethod('PUT', apiLambdaInt);
    topicById.addMethod('DELETE', apiLambdaInt);
    topicById.addResource('subscription').addMethod('POST', topicsSubLambdaInt);
    topicById.addResource('subscribers').addMethod('GET', topicsSubLambdaInt);
    const notificationsResource = api.root.addResource('notifications');
    notificationsResource.addMethod('GET', notifLambdaInt);
    notificationsResource.addMethod('POST', notifLambdaInt, { authorizationType: apigateway.AuthorizationType.NONE });
    notificationsResource.addResource('test').addMethod('POST', notifLambdaInt);
    const notifById = notificationsResource.addResource('{notificationId}');
    notifById.addMethod('GET', notifLambdaInt);
    notifById.addMethod('PUT', notifLambdaInt);
    notifById.addResource('comments').addMethod('POST', notifLambdaInt);
    const ordersResource = api.root.addResource('orders');
    ordersResource.addMethod('GET', ordersLambdaInt);
    const orderById = ordersResource.addResource('{orderNo}');
    orderById.addMethod('GET', ordersLambdaInt);
    orderById.addMethod('PUT', ordersLambdaInt);
    const webhooks = api.root.addResource('webhooks');
    webhooks.addMethod('GET', apiLambdaInt);
    webhooks.addMethod('POST', apiLambdaInt);
    webhooks.addResource('trigger').addResource('{id}').addMethod('POST', apiLambdaInt, { authorizationType: apigateway.AuthorizationType.NONE });
    const calendar = api.root.addResource('calendar');
    calendar.addMethod('GET', apiLambdaInt);
    calendar.addMethod('POST', apiLambdaInt);
    api.root.addResource('audit-logs').addMethod('GET', apiLambdaInt);
    api.root.addResource('emails').addMethod('GET', apiLambdaInt);
    const pushSubs = api.root.addResource('push-subscriptions');
    pushSubs.addMethod('POST', apiLambdaInt);
    pushSubs.addMethod('DELETE', apiLambdaInt);

    // --- CFN OUTPUTS ---
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
