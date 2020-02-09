#!/usr/bin/env node
import 'source-map-support/register';
import { env } from '@hydrocut-trail-status/utilities';
import * as cdk from '@aws-cdk/core';
import Stack from './stack';

const app = new cdk.App();
new Stack(app, 'HydrocutTrailStatusStack', {
  env: {
    account: env('AWS_ACCOUNT_ID'),
    region: env('AWS_REGION')
  }
});
