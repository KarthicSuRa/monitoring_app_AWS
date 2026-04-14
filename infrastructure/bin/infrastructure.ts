#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

// Get environment from context, with a default fallback
const environment = app.node.tryGetContext('env') || 'dev';

new InfrastructureStack(app, `EcomMonitorStack-${environment}`,
  {
    environment,
    env: { 
      account: process.env.CDK_DEFAULT_ACCOUNT || '867958227307',
      region: process.env.CDK_DEFAULT_REGION || 'ap-southeast-2' 
    },
  }
);
