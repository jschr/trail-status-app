#!/usr/bin/env node
import 'source-map-support/register';
import { env } from '@trail-status-app/utilities';
import * as cdk from '@aws-cdk/core';
import Stack from './stack';

const app = new cdk.App();
new Stack(app, `${env('PROJECT')}`, {
  env: {
    account: env('AWS_ACCOUNT_ID'),
    region: env('AWS_REGION')
  }
});
