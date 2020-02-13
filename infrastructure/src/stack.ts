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

    const trailAuthTable = new dynamodb.Table(this, tables.trailAuth.name, {
      tableName: tables.trailAuth.name,
      partitionKey: tables.trailAuth.partitionKey,
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

    // /status
    const trailStatusApi = api.root.addResource('status');

    // GET /status
    const getTrailStatusHandler = new lambda.Function(
      this,
      `${env('PROJECT')}-getTrailStatus`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/functions/getTrailStatus.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT')
        }
      }
    );

    const getTrailStatusIntegration = new apigateway.LambdaIntegration(
      getTrailStatusHandler
    );

    trailStatusApi.addMethod('GET', getTrailStatusIntegration);
    trailStatusTable.grantReadData(getTrailStatusHandler);

    // PUT /status
    const updateTrailStatusHandler = new lambda.Function(
      this,
      `${env('PROJECT')}-updateTrailStatus`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/functions/updateTrailStatus.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT')
        }
      }
    );

    const updateTrailStatusIntegration = new apigateway.LambdaIntegration(
      updateTrailStatusHandler
    );

    trailStatusApi.addMethod('PUT', updateTrailStatusIntegration);
    trailStatusTable.grantReadWriteData(updateTrailStatusHandler);

    // twitter
    const twitterApi = api.root.addResource('twitter');
    const twitterAuthorizeApi = twitterApi.addResource('authorize');
    const twitterAuthorizeCallbackApi = twitterAuthorizeApi.addResource(
      'callback'
    );

    // GET /twitter/authorize
    const authorizeTwitterHandler = new lambda.Function(
      this,
      `${env('PROJECT')}-authorizeTwitter`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/functions/authorizeTwitter.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT'),
          TWITTER_CONSUMER_KEY: env('TWITTER_CONSUMER_KEY'),
          TWITTER_CONSUMER_SECRET: env('TWITTER_CONSUMER_SECRET')
        }
      }
    );

    const authorizeTwitterIntegration = new apigateway.LambdaIntegration(
      authorizeTwitterHandler
    );

    twitterAuthorizeApi.addMethod('GET', authorizeTwitterIntegration);
    trailAuthTable.grantReadWriteData(authorizeTwitterHandler);

    // GET twitter/authorize/callback
    const authorizeTwitterCallbackHandler = new lambda.Function(
      this,
      `${env('PROJECT')}-authorizeTwitterCallback`,
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/functions/authorizeTwitterCallback.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT'),
          TWITTER_CONSUMER_KEY: env('TWITTER_CONSUMER_KEY'),
          TWITTER_CONSUMER_SECRET: env('TWITTER_CONSUMER_SECRET')
        }
      }
    );

    const authorizeTwitterCallbackIntegration = new apigateway.LambdaIntegration(
      authorizeTwitterCallbackHandler
    );

    twitterAuthorizeCallbackApi.addMethod(
      'GET',
      authorizeTwitterCallbackIntegration
    );
    trailAuthTable.grantReadWriteData(authorizeTwitterCallbackHandler);
  }
}
