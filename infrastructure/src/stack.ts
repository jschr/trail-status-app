import { env } from '@hydrocut-trail-status/utilities';
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import path from 'path';
import tables from './tables';

const packagePath = path.join(__dirname, '../../tmp/package.zip');

export default class extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Database
    const trailStatusTable = new dynamodb.Table(this, tables.trailStatus.name, {
      tableName: tables.trailStatus.name,
      partitionKey: tables.trailStatus.partitionKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN
    });

    // API
    const api = new apigateway.RestApi(this, `${env('PROJECT')}-api`, {
      deployOptions: { stageName: env('STAGE') }
    });
    const trailStatusApi = api.root.addResource('status');

    const getTrailStatusHandler = new lambda.Function(
      this,
      `${env('PROJECT')}-getTrailStatus`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/functions/getTrailStatus.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT')
        }
      }
    );

    const getTrailStatusIntegration = new apigateway.LambdaIntegration(
      getTrailStatusHandler
    );

    trailStatusApi.addMethod('GET', getTrailStatusIntegration);
    trailStatusTable.grantReadData(getTrailStatusHandler);

    const updateTrailStatusHandler = new lambda.Function(
      this,
      `${env('PROJECT')}-updateTrailStatus`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/functions/updateTrailStatus.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT')
        }
      }
    );

    const updateTrailStatusIntegration = new apigateway.LambdaIntegration(
      updateTrailStatusHandler
    );

    trailStatusApi.addMethod('PUT', updateTrailStatusIntegration);
    trailStatusTable.grantReadWriteData(updateTrailStatusHandler);
  }
}
