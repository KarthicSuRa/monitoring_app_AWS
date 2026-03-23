
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

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'McmAlertsVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'private-with-egress',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
    
    const dbPassword = 'McmAlertsDbPassword123!';

    const dbInstance = new rds.DatabaseInstance(this, 'McmAlertsDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.of('16.13', '16') }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO), // Free tier eligible
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      credentials: rds.Credentials.fromPassword('postgres', cdk.SecretValue.plainText(dbPassword)),
      databaseName: 'mcm_alerts_db',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
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
      generateSecret: false, // Recommended for web clients
    });

    const frontendBucket = new s3.Bucket(this, 'McmAlertsFrontendBucket', {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        publicReadAccess: false, // CloudFront will access it, not the public
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
        }
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployMcmAlertsFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../client/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    const api = new apigateway.RestApi(this, 'McmAlertsApi', {
      restApiName: 'MCM Alerts Service API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['Authorization']),
        allowCredentials: true,
      },
    });
    
    const lambdaCode = lambda.Code.fromAsset(path.join(__dirname, '../../lambdas'));

    const authLambda = new lambda.Function(this, 'McmAuthLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'auth-lambda.handler',
        code: lambdaCode,
        environment: {
            COGNITO_USER_POOL_ID: userPool.userPoolId,
            COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
            CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`
        },
    });

    authLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: ["cognito-idp:SignUp", "cognito-idp:AdminConfirmSignUp"],
        resources: [userPool.userPoolArn],
    }));

    const signupResource = api.root.addResource('signup');
    signupResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));

    const sqlScript = fs.readFileSync(path.join(__dirname, '../../schema.sql'), 'utf8');

    const dbInitLambda = new lambda.Function(this, 'DbInitLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'db-init-lambda.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas')),
        vpc: vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
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
        }
    });

    dbInitCustomResource.node.addDependency(dbInstance);

    const apiLambda = new lambda.Function(this, 'McmApiLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'api-lambda.handler',
      code: lambdaCode,
      timeout: Duration.seconds(30),
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_NAME: 'mcm_alerts_db',
        DB_USER: 'postgres',
        DB_PASSWORD: dbPassword,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`
      },
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    dbInstance.connections.allowDefaultPortFrom(apiLambda);

    const apiLambdaIntegration = new apigateway.LambdaIntegration(apiLambda);

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
    
    const topics = api.root.addResource('topics');
    topics.addMethod('GET', apiLambdaIntegration);
    topics.addMethod('POST', apiLambdaIntegration);

    const notifications = api.root.addResource('notifications');
    notifications.addMethod('GET', apiLambdaIntegration);

    const webhooks = api.root.addResource('webhooks');
    webhooks.addMethod('GET', apiLambdaIntegration);
    webhooks.addMethod('POST', apiLambdaIntegration);

    const calendar = api.root.addResource('calendar');
    calendar.addMethod('GET', apiLambdaIntegration);
    calendar.addMethod('POST', apiLambdaIntegration);

    const auditLogs = api.root.addResource('audit-logs');
    auditLogs.addMethod('GET', apiLambdaIntegration);

    const emails = api.root.addResource('emails');
    emails.addMethod('GET', apiLambdaIntegration);

    api.latestDeployment?.node.addDependency(dbInitCustomResource);

    new cdk.CfnOutput(this, 'McmAlertsCloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The URL for the CloudFront distribution.',
    });
    new cdk.CfnOutput(this, 'McmAlertsApiGatewayUrl', {
      value: api.url,
      description: 'The URL for the API Gateway.',
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
        value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
        value: userPoolClient.userPoolClientId,
    });
  }
}
