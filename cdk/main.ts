#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import Stack from './stack';

const app = new cdk.App();
new Stack(app, 'HydrocutTrailStatusStack');
