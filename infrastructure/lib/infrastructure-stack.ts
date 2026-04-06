
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
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
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

const serviceAccountCredentials = {
  "type": "service_account",
  "project_id": "mcm-push",
  "private_key_id": "76f0c0de2f5cc34555476677820c00f2415327ae",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDc152KSK1OCSHn\nbNUPLlsB8eOdCeiGkuxlLPDAUpGYXWwP7X173pS9xbhUrJ3+Ase+MHXdCISG8N/7\nEDwzibK9ywa86Pl1Zj9MmiK4dnNaL1KIMFjzUxTlmTv9HIMubuGRrvpsdZl9cQ3h\nSE3d2H1A/zyhLCUusR80d95ZL1JJQzvSFcvhBUc9wwNP0ovorvegiqAHeYeWwIx/\nR2sBG/Xhf3Mtb1l3o0kbX0Wdn3S8y/Wn4SgQ4lxtt2uyq2odACX86o/HEIvvJjRD\nP5xMomnJtxDwIwZ3axOSnCUz394eqqQWKz66VZ6HO50xIGym/OJxjcOc3rgGtcWp\nw0bwSyPDAgMBAAECggEAFYiww+fySvmsMXTBq1YWnOOJRKoCrAMHkGLUo7kC/87P\ncRfA2wmivbgNEU422aqyIpZD5+Zv7Cu9eC2zfd/SngJK1ec7UkdC3nIcXWava/8E\nfS/s4uaz0u+Hxrzqmn+u+K9AzyXO1OLnoSzIhI+0WiVWAO4QPubmgNpvXYlPuY6D\nKmCMxoi30OcmH0y92ND/lu9J5hexGfmTEaJK4c4+cxjrGpBYUz0QUJDXrC42fMrY\nJ1A5GzJ6F9d2lO2Pr5Buf5XTFcauUnzAmdFLAjro0bVbLx+OZ9KX66L9XV7sSj/k\nGe0CS/kMWfVJMycSao1bblTXI6ayB7l2FtiNBcfMAQKBgQD2M/e/BGMgIl21g8so\nXZrClZcybZWlkcGs01MuOJocgprV+R0QqXUVD4+UHb9//bCKSUgLNKTi3SpjJznW\nksVxt5GQ7f3dZ/USgZA8ccC8ijQU/eMi5hw4ESR9H6FxpydOVpLbLHW5HIWbiwc0\npfynl10PcYDhbqwCqw54+HTBYQKBgQDloU0x4cwjQqn9ayEDbstxGoHQ/bAwiNzD\nyh7v1PX7KOKik8AoW30n1ar063LivkjblFwTjruIRymei8pbYPJaaEyVAlggQH+3\n3OoFd2xzcM+C4arFqNr7XkpM63/MoNDUQ/kyezeAqltgTR9G7/Xc7o/cFOQ2arXi\nIiROGVvjowKBgAtICFMlZVFkobyehGGeIGhIKHx0DwZeLmy35jjY+R7TUTr6xj0s\nNqQ3aVHVJyA7RKqhfv6cc+29SqLuejT91rRGQBJPBXHuwIkPjMdoQvegsZBArfa8\napCbIHvnRiOKEEADsYj/eYl46BpffX4JGRGo2ufJQKmTw6f/pJMgd2EhAoGADgBT\n0KLP66Z47vbFQIxU40SWfcO6Jntx2o5MbJszlGjdyMPxh4RskS06C0z/6Etp7dmR\n869UR+7u3rfvUrsKi/CoGr3V2cGVCAT0T/kEJ9XNEVHpM7wj/ge1yBLj6/oyQX8T\nhrx0mefJQonxSkX/W8VACE9NyvOeu3cRd6GcNLkCgYAuc6m8iOPOzzDfWtB2Hng+\nEhx3VHqNKwvElKMVL2tHKOPg/ssSktfYc5L+YCSzFoBnIqHzh5nYVNI3Py6VJ390\nVZu+2EPnUazgPWPytXlxpHLc4i/IKSPoQ/ookzbnK1VNVgdmXj73+bAedRb3jzQh\nZFQBYCVdKMKmG6idQ5H3eQ==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@mcm-push.iam.gserviceaccount.com",
  "client_id": "112925046910760876565",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40mcm-push.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'McmAlertsVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    vpc.addGatewayEndpoint('S3GatewayEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
    vpc.addInterfaceEndpoint('CloudFormationEndpoint', { service: ec2.InterfaceVpcEndpointAwsService.CLOUDFORMATION });
    vpc.addInterfaceEndpoint('CognitoIdpEndpoint', {
      service: new ec2.InterfaceVpcEndpointService(
        `com.amazonaws.${this.region}.cognito-idp`
      ),
    });
    vpc.addInterfaceEndpoint('StsEndpoint', { service: ec2.InterfaceVpcEndpointAwsService.STS });
    vpc.addInterfaceEndpoint('Ec2Endpoint', { service: ec2.InterfaceVpcEndpointAwsService.EC2 });
    vpc.addInterfaceEndpoint('LambdaEndpoint', { service: ec2.InterfaceVpcEndpointAwsService.LAMBDA });
    vpc.addInterfaceEndpoint('EventsEndpoint', { service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_EVENTS });
    vpc.addInterfaceEndpoint('SnsEndpoint', { service: ec2.InterfaceVpcEndpointAwsService.SNS });
    vpc.addInterfaceEndpoint('LogsEndpoint', { service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS });

    const dbPassword = 'McmAlertsDbPassword123!';

    const dbInstance = new rds.DatabaseInstance(this, 'McmAlertsDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.of('16.13', '16') }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      credentials: rds.Credentials.fromPassword('postgres', cdk.SecretValue.unsafePlainText(dbPassword)),
      databaseName: 'mcm_alerts_db',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPool = new cognito.UserPool(this, 'McmAlertsUserPool', {
      userPoolName: 'mcm-alerts-user-pool',
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'McmAlertsUserPoolClient', {
      userPool,
      generateSecret: false,
    });

    const pushNotificationTopic = new sns.Topic(this, 'McmPushNotificationTopic', {
      displayName: 'MCM Alerts Push Notification Topic',
    });

    const credentialsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(serviceAccountCredentials))
      .digest('hex')
      .slice(0, 12);

      const appName = `McmFcmApp-${credentialsHash}`;
      const fcmPlatformApplication = new cr.AwsCustomResource(this, 'FcmPlatformApplicationV3', {
        onCreate: {
          service: 'SNS',
          action: 'createPlatformApplication',
          parameters: {
            Name: appName,
            Platform: 'GCM',
            Attributes: {
              PlatformCredential: JSON.stringify(serviceAccountCredentials),
            },
          },
          physicalResourceId: cr.PhysicalResourceId.of(appName),
        },
        onUpdate: { // Using onCreate logic for update as it is idempotent
            service: 'SNS',
            action: 'createPlatformApplication',
            parameters: {
              Name: appName,
              Platform: 'GCM',
              Attributes: {
                PlatformCredential: JSON.stringify(serviceAccountCredentials),
              },
            },
            physicalResourceId: cr.PhysicalResourceId.of(appName),
          },
        onDelete: {
          service: 'SNS',
          action: 'deletePlatformApplication',
          parameters: {
            PlatformApplicationArn: new cr.PhysicalResourceIdReference(),
          },
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });

    const fcmPlatformApplicationArn = fcmPlatformApplication.getResponseField('PlatformApplicationArn');

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
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

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
        restApiName: 'MCM Alerts Service API',
        defaultCorsPreflightOptions: {
          allowOrigins: [
            'http://localhost:3000',
            `https://${distribution.distributionDomainName}`],
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

    const checkerLambda = new lambda.Function(this, 'McmCheckerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'checker-lambda.handler',
      code: lambdaCode,
      timeout: Duration.seconds(20),
    });

    const vpcLambdaProps = {
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    };

    const authLambda = new lambda.Function(this, 'McmAuthLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'auth-lambda.handler',
      code: lambdaCode,
      ...vpcLambdaProps,
      environment: {
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`,
      },
    });

    authLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:SignUp', 'cognito-idp:AdminConfirmSignUp'],
      resources: [userPool.userPoolArn],
    }));

    const signupResource = api.root.addResource('signup');
    signupResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    const sqlScript = fs.readFileSync(path.join(__dirname, '../../lambdas/schema.sql'), 'utf8');

    const dbInitLambda = new lambda.Function(this, 'DbInitLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'db-init-lambda.handler',
      code: lambdaCode,
      ...vpcLambdaProps,
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_NAME: 'mcm_alerts_db',
        DB_USER: 'postgres',
        DB_PASSWORD: dbPassword,
      },
      timeout: cdk.Duration.minutes(5),
    });

    dbInstance.connections.allowDefaultPortFrom(dbInitLambda);
    dbInstance.grantConnect(dbInitLambda, 'postgres');

    const dbInitProvider = new cr.Provider(this, 'DbInitProvider', {
      onEventHandler: dbInitLambda,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const dbInitCustomResource = new cdk.CustomResource(this, 'DbInitCustomResource', {
      serviceToken: dbInitProvider.serviceToken,
      properties: {
        scriptHash: crypto.createHash('sha256').update(sqlScript).digest('hex'),
      },
    });

    dbInitCustomResource.node.addDependency(dbInstance);

    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambdaCode,
      timeout: Duration.seconds(90),
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_NAME: 'mcm_alerts_db',
        DB_USER: 'postgres',
        DB_PASSWORD: dbPassword,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`,
      },
      ...vpcLambdaProps,
    };

    const notificationLambda = new lambda.Function(this, 'McmNotificationLambda', {
      ...commonLambdaProps,
      handler: 'notification-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        SNS_TOPIC_ARN: pushNotificationTopic.topicArn,
      },
    });
    dbInstance.connections.allowDefaultPortFrom(notificationLambda);
    pushNotificationTopic.grantPublish(notificationLambda);

    const monitoringLambda = new lambda.Function(this, 'McmMonitoringLambda', {
      ...commonLambdaProps,
      handler: 'monitoring-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        NOTIFICATION_LAMBDA_NAME: notificationLambda.functionName,
        CHECKER_LAMBDA_NAME: checkerLambda.functionName,
      },
    });
    dbInstance.connections.allowDefaultPortFrom(monitoringLambda);
    checkerLambda.grantInvoke(monitoringLambda);

    const rule = new events.Rule(this, 'McmMonitoringRule', {
      schedule: events.Schedule.expression('cron(0 */2 * * ? *)'),
    });

    rule.addTarget(new targets.LambdaFunction(monitoringLambda));
    notificationLambda.grantInvoke(monitoringLambda);

    const apiLambda = new lambda.Function(this, 'McmApiLambda', {
      ...commonLambdaProps,
      handler: 'api-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        SNS_TOPIC_ARN: pushNotificationTopic.topicArn,
        SNS_PLATFORM_APPLICATION_ARN: fcmPlatformApplicationArn,
      },
    });
    dbInstance.connections.allowDefaultPortFrom(apiLambda);

    const apiLambdaSnsPolicy = new iam.PolicyStatement({
      actions: [
        'sns:CreatePlatformEndpoint',
        'sns:DeletePlatformEndpoint',
        'sns:GetEndpointAttributes',
        'sns:SetEndpointAttributes',
        'sns:Subscribe',
        'sns:Unsubscribe',
      ],
      resources: [
        fcmPlatformApplicationArn,
        `${fcmPlatformApplicationArn}/endpoint/*`,
        pushNotificationTopic.topicArn,
      ],
    });
    apiLambda.addToRolePolicy(apiLambdaSnsPolicy);

    const topicSubscribersLambda = new lambda.Function(this, 'TopicSubscribersLambda', {
      ...commonLambdaProps,
      handler: 'topic-subscribers-lambda.handler',
    });
    dbInstance.connections.allowDefaultPortFrom(topicSubscribersLambda);

    const apiLambdaIntegration = new apigateway.LambdaIntegration(apiLambda);
    const notificationLambdaIntegration = new apigateway.LambdaIntegration(notificationLambda);
    const topicSubscribersLambdaIntegration = new apigateway.LambdaIntegration(topicSubscribersLambda);

    const users = api.root.addResource('users');
    users.addMethod('GET', apiLambdaIntegration);
    const user = users.addResource('{userId}');
    user.addMethod('GET', apiLambdaIntegration);
    user.addMethod('PUT', apiLambdaIntegration);

    const teams = api.root.addResource('teams');
    teams.addMethod('GET', apiLambdaIntegration);

    const sites = api.root.addResource('sites');
    sites.addMethod('GET', apiLambdaIntegration);
    sites.addMethod('POST', apiLambdaIntegration);
    const site = sites.addResource('{siteId}');
    site.addMethod('DELETE', apiLambdaIntegration);

    const monitoring = api.root.addResource('monitoring');
    monitoring.addMethod('GET', apiLambdaIntegration);
    const monitoringTrigger = monitoring.addResource('trigger');
    monitoringTrigger.addMethod('POST', new apigateway.LambdaIntegration(monitoringLambda));

    const schedule = monitoring.addResource('schedule');
    const scheduleLambda = new lambda.Function(this, 'McmScheduleLambda', {
      ...commonLambdaProps,
      handler: 'schedule-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        RULE_NAME: rule.ruleName,
      },
    });
    schedule.addMethod('PUT', new apigateway.LambdaIntegration(scheduleLambda));

    scheduleLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['events:PutRule'],
      resources: [rule.ruleArn],
    }));

    const topics = api.root.addResource('topics');
    topics.addMethod('GET', apiLambdaIntegration);
    topics.addMethod('POST', apiLambdaIntegration);

    const topicResource = topics.addResource('{topicId}');
    const subscriptionResource = topicResource.addResource('subscription');
    subscriptionResource.addMethod('POST', topicSubscribersLambdaIntegration);
    const subscribersResource = topicResource.addResource('subscribers');
    subscribersResource.addMethod('GET', topicSubscribersLambdaIntegration);

    const notifications = api.root.addResource('notifications');
    notifications.addMethod('GET', notificationLambdaIntegration);
    notifications.addMethod('POST', notificationLambdaIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    const testNotification = notifications.addResource('test');
    testNotification.addMethod('POST', notificationLambdaIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    const notificationById = notifications.addResource('{notificationId}');
    notificationById.addMethod('GET', notificationLambdaIntegration);
    notificationById.addMethod('PUT', notificationLambdaIntegration);

    const comments = notificationById.addResource('comments');
    comments.addMethod('POST', notificationLambdaIntegration);

    const webhooks = api.root.addResource('webhooks');
    webhooks.addMethod('GET', apiLambdaIntegration);
    webhooks.addMethod('POST', apiLambdaIntegration);

    const webhookTrigger = webhooks.addResource('trigger').addResource('{id}');
    webhookTrigger.addMethod('POST', apiLambdaIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    const calendar = api.root.addResource('calendar');
    calendar.addMethod('GET', apiLambdaIntegration);
    calendar.addMethod('POST', apiLambdaIntegration);

    const auditLogs = api.root.addResource('audit-logs');
    auditLogs.addMethod('GET', apiLambdaIntegration);

    const emails = api.root.addResource('emails');
    emails.addMethod('GET', apiLambdaIntegration);

    const pushSubscriptions = api.root.addResource('push-subscriptions');
    pushSubscriptions.addMethod('POST', apiLambdaIntegration);
    pushSubscriptions.addMethod('DELETE', apiLambdaIntegration);

    const apiDeployment = api.latestDeployment;
    if (!apiDeployment) {
      throw new Error('RestApi.latestDeployment is unexpectedly undefined.');
    }
    apiDeployment.node.addDependency(dbInitCustomResource);

    const webSocketApi = new apigw2.WebSocketApi(this, 'McmAlertsWebSocketApi');
    const webSocketStage = new apigw2.WebSocketStage(this, 'McmAlertsWebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    const webSocketHandler = new lambda.Function(this, 'McmWebSocketLambda', {
      ...commonLambdaProps,
      handler: 'websocket-lambda.handler',
      environment: {
        ...commonLambdaProps.environment,
        WEBSOCKET_API_ENDPOINT: webSocketStage.url,
      },
    });

    dbInstance.connections.allowDefaultPortFrom(webSocketHandler);

    const webSocketAuthLambda = new lambda.Function(this, 'McmWebSocketAuthLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'websocket-auth-lambda.handler',
      code: lambdaCode,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    const webSocketAuthorizer = new WebSocketLambdaAuthorizer('McmWebSocketAuthorizerV2', webSocketAuthLambda, {
      identitySource: ['route.request.querystring.token'],
    });

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

    new cdk.CfnOutput(this, 'McmAlertsCloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The URL for the CloudFront distribution.',
    });
    new cdk.CfnOutput(this, 'McmAlertsApiGatewayUrl', {
      value: api.url,
      description: 'The URL for the API Gateway.',
    });
    new cdk.CfnOutput(this, 'McmAlertsWebSocketApiUrl', {
      value: webSocketStage.url,
      description: 'The URL for the WebSocket API.',
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'SnsTopicArn', {
      value: pushNotificationTopic.topicArn,
      description: 'ARN of the SNS topic for push notifications.',
    });
    new cdk.CfnOutput(this, 'SnsPlatformApplicationArn', {
      value: fcmPlatformApplicationArn,
      description: 'ARN of the SNS Platform Application for FCM.',
    });
    new cdk.CfnOutput(this, 'McmAlertsCloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'The ID of the CloudFront distribution.',
    });
  }
}