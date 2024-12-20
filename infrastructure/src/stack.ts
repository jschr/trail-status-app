import { env } from '@trail-status-app/utilities';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import path from 'path';
import tables from './tables';
import projectPrefix from './projectPrefix';

const packagePath = path.join(__dirname, '../../tmp/package.zip');

export default class extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // User table
    const userTable = new dynamodb.Table(this, tables.users.name, {
      tableName: tables.users.name,
      partitionKey: tables.users.partitionKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
    });

    // Region table
    const regionsTable = new dynamodb.Table(this, tables.regions.name, {
      tableName: tables.regions.name,
      partitionKey: tables.regions.partitionKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
    });

    const regionsByUserIndex = tables.regions.indexes.regionsByUser;
    regionsTable.addGlobalSecondaryIndex({
      indexName: regionsByUserIndex.name,
      partitionKey: regionsByUserIndex.partitionKey,
      sortKey: regionsByUserIndex.sortKey,
    });

    // Region status table
    const regionStatusTable = new dynamodb.Table(
      this,
      tables.regionStatus.name,
      {
        tableName: tables.regionStatus.name,
        partitionKey: tables.regionStatus.partitionKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy:
          env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
            ? cdk.RemovalPolicy.DESTROY
            : cdk.RemovalPolicy.RETAIN,
      },
    );

    // Trails table
    const trailsTable = new dynamodb.Table(this, tables.trails.name, {
      tableName: tables.trails.name,
      partitionKey: tables.trails.partitionKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
    });

    const trailsByRegionIndex = tables.trails.indexes.trailsByRegion;
    trailsTable.addGlobalSecondaryIndex({
      indexName: trailsByRegionIndex.name,
      partitionKey: trailsByRegionIndex.partitionKey,
      sortKey: trailsByRegionIndex.sortKey,
    });

    // Trail status table
    const trailStatusTable = new dynamodb.Table(this, tables.trailStatus.name, {
      tableName: tables.trailStatus.name,
      partitionKey: tables.trailStatus.partitionKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
    });

    // Webhooks table
    const webhooksTable = new dynamodb.Table(this, tables.webhooks.name, {
      tableName: tables.webhooks.name,
      partitionKey: tables.webhooks.partitionKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
    });

    const webhooksByRegionIndex = tables.webhooks.indexes.webhooksByRegion;
    webhooksTable.addGlobalSecondaryIndex({
      indexName: webhooksByRegionIndex.name,
      partitionKey: webhooksByRegionIndex.partitionKey,
      sortKey: webhooksByRegionIndex.sortKey,
    });

    // Region status history table
    const regionStatusHistoryTable = new dynamodb.Table(
      this,
      tables.regionStatusHistory.name,
      {
        tableName: tables.regionStatusHistory.name,
        partitionKey: tables.regionStatusHistory.partitionKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy:
          env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
            ? cdk.RemovalPolicy.DESTROY
            : cdk.RemovalPolicy.RETAIN,
      },
    );

    const regionStatusHistoryByRegionIndex =
      tables.regionStatusHistory.indexes.regionStatusHistoryByRegion;
    regionStatusHistoryTable.addGlobalSecondaryIndex({
      indexName: regionStatusHistoryByRegionIndex.name,
      partitionKey: regionStatusHistoryByRegionIndex.partitionKey,
      sortKey: regionStatusHistoryByRegionIndex.sortKey,
    });

    const regionStatusHistoryByInstagramPostIndex =
      tables.regionStatusHistory.indexes.regionStatusHistoryByInstagramPost;
    regionStatusHistoryTable.addGlobalSecondaryIndex({
      indexName: regionStatusHistoryByInstagramPostIndex.name,
      partitionKey: regionStatusHistoryByInstagramPostIndex.partitionKey,
      sortKey: regionStatusHistoryByInstagramPostIndex.sortKey,
    });

    // Queues

    // Sync regions

    const runSyncUsersDeadletter = new sqs.Queue(
      this,
      projectPrefix('runSyncUsersJobDeadletter'),
      {
        fifo: true,
        queueName: projectPrefix('runSyncUsersJobDeadletter.fifo'),
      },
    );

    // Set to vibility timeout to 6 times the runWebhooks lambda timeout
    // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
    const runSyncUsersHandlerTimeout = 15;
    const runSyncUsersQueue = new sqs.Queue(
      this,
      projectPrefix('runSyncUsersJob'),
      {
        fifo: true,
        queueName: projectPrefix('runSyncUsersJob.fifo'),
        contentBasedDeduplication: true,
        deliveryDelay: cdk.Duration.seconds(30),
        // Set to vibility timeout to 6 times the runWebhooks lambda timeout
        // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
        visibilityTimeout: cdk.Duration.seconds(6 * runSyncUsersHandlerTimeout),
        deadLetterQueue: {
          queue: runSyncUsersDeadletter,
          maxReceiveCount: 10,
        },
      },
    );

    // Trail webhooks

    const runWebhooksDeadletter = new sqs.Queue(
      this,
      projectPrefix('runWebhooksJobDeadletter'),
      {
        fifo: true,
        queueName: projectPrefix('runWebhooksJobDeadletter.fifo'),
      },
    );

    // Set to vibility timeout to 6 times the runWebhooks lambda timeout
    // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
    const runWebhooksHandlerTimeout = 15;
    const runWebhooksQueue = new sqs.Queue(
      this,
      projectPrefix('runWebhooksJob'),
      {
        fifo: true,
        queueName: projectPrefix('runWebhooksJob.fifo'),
        contentBasedDeduplication: true,
        deliveryDelay: cdk.Duration.seconds(30),
        visibilityTimeout: cdk.Duration.seconds(6 * runWebhooksHandlerTimeout),
        deadLetterQueue: {
          queue: runWebhooksDeadletter,
          maxReceiveCount: 10,
        },
      },
    );

    // API
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      projectPrefix('zone'),
      {
        hostedZoneId: env('HOSTED_ZONE_ID'),
        zoneName: env('TLD'),
      },
    );

    const sslCertificate = acm.Certificate.fromCertificateArn(
      this,
      projectPrefix('ssl'),
      env('SSL_ARN'),
    );

    const api = new apigateway.RestApi(this, projectPrefix('api'), {
      domainName: {
        domainName: `${env('API_SUBDOMAIN')}.${env('TLD')}`,
        certificate: sslCertificate,
      },
      deployOptions: { stageName: 'stage' },
    });

    new route53.ARecord(this, projectPrefix('api-record'), {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api),
      ),
      recordName: env('API_SUBDOMAIN'),
    });

    const envVars = {
      PROJECT: env('PROJECT'),
      DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
      API_ENDPOINT: env('API_ENDPOINT'),
      API_SUBDOMAIN: env('API_SUBDOMAIN'),
      INSTAGRAM_APP_ID: env('INSTAGRAM_APP_ID'),
      INSTAGRAM_APP_SECRET: env('INSTAGRAM_APP_SECRET'),
      TLD: env('TLD'),
      JWT_SECRET: env('JWT_SECRET'),
      JWT_EXPIRES_IN: env('JWT_EXPIRES_IN'),
      FRONTEND_ENDPOINT: env('FRONTEND_ENDPOINT'),
      RUN_SYNC_USERS_QUEUE_URL: runSyncUsersQueue.queueUrl,
      RUN_WEBHOOKS_QUEUE_URL: runWebhooksQueue.queueUrl,
      FIREBASE_PROJECT_ID: env('FIREBASE_PROJECT_ID'),
      FIREBASE_PRIVATE_KEY: env('FIREBASE_PRIVATE_KEY'),
      FIREBASE_CLIENT_EMAIL: env('FIREBASE_CLIENT_EMAIL'),
      TIMESTREAM_REGION: env('TIMESTREAM_REGION'),
      TIMESTREAM_ACCESS_KEY_ID: env('TIMESTREAM_ACCESS_KEY_ID'),
      TIMESTREAM_SECRET_ACCESS_KEY: env('TIMESTREAM_SECRET_ACCESS_KEY'),
    };

    // /regions
    const regionsApi = api.root.addResource('regions');
    regionsApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /regions
    const getRegionHandler = new lambda.Function(
      this,
      projectPrefix('getRegion'),
      {
        functionName: projectPrefix('getRegion'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getRegion.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getRegionIntegration = new apigateway.LambdaIntegration(
      getRegionHandler,
    );

    regionsApi.addMethod('GET', getRegionIntegration);
    regionsTable.grantReadData(getRegionHandler);
    trailsTable.grantReadData(getRegionHandler);
    webhooksTable.grantReadData(getRegionHandler);
    userTable.grantReadData(getRegionHandler);

    // PUT /regions
    const putRegionHandler = new lambda.Function(
      this,
      projectPrefix('putRegion'),
      {
        functionName: projectPrefix('putRegion'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/putRegion.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const putRegionIntegration = new apigateway.LambdaIntegration(
      putRegionHandler,
    );

    regionsApi.addMethod('PUT', putRegionIntegration);
    regionsTable.grantReadWriteData(putRegionHandler);

    // /regions/status
    const regionStatusApi = regionsApi.addResource('status');
    regionStatusApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /regions/status
    const getRegionStatusHandler = new lambda.Function(
      this,
      projectPrefix('getRegionStatus'),
      {
        functionName: projectPrefix('getRegionStatus'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getRegionStatus.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getRegionStatusIntegration = new apigateway.LambdaIntegration(
      getRegionStatusHandler,
    );

    regionStatusApi.addMethod('GET', getRegionStatusIntegration);
    regionsTable.grantReadData(getRegionStatusHandler);
    regionStatusTable.grantReadData(getRegionStatusHandler);
    trailsTable.grantReadData(getRegionStatusHandler);
    trailStatusTable.grantReadData(getRegionStatusHandler);
    userTable.grantReadData(getRegionStatusHandler);

    // /regions/history
    const regionHistoryApi = regionsApi.addResource('history');
    regionHistoryApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /regions/status
    const getRegionHistoryHandler = new lambda.Function(
      this,
      projectPrefix('getRegionHistory'),
      {
        functionName: projectPrefix('getRegionHistory'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getRegionHistory.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getRegionHistoryIntegration = new apigateway.LambdaIntegration(
      getRegionHistoryHandler,
    );

    regionHistoryApi.addMethod('GET', getRegionHistoryIntegration);
    regionStatusHistoryTable.grantReadData(getRegionHistoryHandler);
    userTable.grantReadData(getRegionHistoryHandler);

    // POST /regions/status

    const postRegionStatusHandler = new lambda.Function(
      this,
      projectPrefix('postRegionStatus'),
      {
        functionName: projectPrefix('postRegionStatus'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postRegionStatus.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const postRegionStatusIntegration = new apigateway.LambdaIntegration(
      postRegionStatusHandler,
    );

    regionStatusApi.addMethod('POST', postRegionStatusIntegration);
    regionsTable.grantReadData(postRegionStatusHandler);
    trailsTable.grantReadData(postRegionStatusHandler);
    regionStatusTable.grantReadWriteData(postRegionStatusHandler);
    regionStatusHistoryTable.grantReadWriteData(postRegionStatusHandler);
    trailStatusTable.grantReadWriteData(postRegionStatusHandler);
    webhooksTable.grantReadData(postRegionStatusHandler);
    userTable.grantReadWriteData(postRegionStatusHandler);
    runWebhooksQueue.grantSendMessages(postRegionStatusHandler);

    // /trails
    const trailsApi = api.root.addResource('trails');
    trailsApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /trails
    const getTrailsHandler = new lambda.Function(
      this,
      projectPrefix('getTrails'),
      {
        functionName: projectPrefix('getTrails'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getTrails.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getTrailsIntegration = new apigateway.LambdaIntegration(
      getTrailsHandler,
    );

    trailsApi.addMethod('GET', getTrailsIntegration);
    trailsTable.grantReadData(getTrailsHandler);

    // POST /trails
    const postTrailHandler = new lambda.Function(
      this,
      projectPrefix('postTrail'),
      {
        functionName: projectPrefix('postTrail'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postTrail.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const postTrailIntegration = new apigateway.LambdaIntegration(
      postTrailHandler,
    );

    trailsApi.addMethod('POST', postTrailIntegration);
    trailsTable.grantReadWriteData(postTrailHandler);
    regionStatusTable.grantReadData(postTrailHandler);
    trailStatusTable.grantReadWriteData(postTrailHandler);
    regionsTable.grantReadWriteData(postTrailHandler);

    // PUT /trails
    const putTrailHandler = new lambda.Function(
      this,
      projectPrefix('putTrail'),
      {
        functionName: projectPrefix('putTrail'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/putTrail.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const putTrailIntegration = new apigateway.LambdaIntegration(
      putTrailHandler,
    );

    trailsApi.addMethod('PUT', putTrailIntegration);
    trailsTable.grantReadWriteData(putTrailHandler);
    regionsTable.grantReadWriteData(putTrailHandler);

    // DELETE /trails
    const deleteTrailHandler = new lambda.Function(
      this,
      projectPrefix('deleteTrail'),
      {
        functionName: projectPrefix('deleteTrail'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/deleteTrail.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const deleteTrailIntegration = new apigateway.LambdaIntegration(
      deleteTrailHandler,
    );

    trailsApi.addMethod('DELETE', deleteTrailIntegration);
    trailsTable.grantReadWriteData(deleteTrailHandler);
    trailStatusTable.grantReadWriteData(deleteTrailHandler);
    regionsTable.grantReadWriteData(deleteTrailHandler);

    // /trails/status
    const trailStatusApi = trailsApi.addResource('status');
    trailStatusApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /trails/status
    const getTrailStatusHandler = new lambda.Function(
      this,
      projectPrefix('getTrailStatus'),
      {
        functionName: projectPrefix('getTrailStatus'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getTrailStatus.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getTrailStatusIntegration = new apigateway.LambdaIntegration(
      getTrailStatusHandler,
    );

    trailStatusApi.addMethod('GET', getTrailStatusIntegration);
    regionsTable.grantReadData(getTrailStatusHandler);
    trailsTable.grantReadData(getTrailStatusHandler);
    userTable.grantReadData(getTrailStatusHandler);

    // TODO: Legacy, remove when devices use new api
    // /status
    const legacyTrailStatusApi = api.root.addResource('status');
    legacyTrailStatusApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /status
    const getLegacyTrailStatusHandler = new lambda.Function(
      this,
      projectPrefix('getLegacyTrailStatus'),
      {
        functionName: projectPrefix('getLegacyTrailStatus'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getLegacyTrailStatus.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getLegacyTrailStatusIntegration = new apigateway.LambdaIntegration(
      getLegacyTrailStatusHandler,
    );

    legacyTrailStatusApi.addMethod('GET', getLegacyTrailStatusIntegration);
    trailStatusTable.grantReadData(getLegacyTrailStatusHandler);
    trailsTable.grantReadData(getLegacyTrailStatusHandler);
    userTable.grantReadData(getLegacyTrailStatusHandler);
    regionStatusTable.grantReadData(getLegacyTrailStatusHandler);
    regionsTable.grantReadData(getLegacyTrailStatusHandler);

    // instagram
    const instagramApi = api.root.addResource('instagram');
    const instagramAuthorizeApi = instagramApi.addResource('authorize');
    const instagramAuthorizeCallbackApi = instagramAuthorizeApi.addResource(
      'callback',
    );

    // GET /instagram/authorize
    const authorizeInstagramHandler = new lambda.Function(
      this,
      projectPrefix('authorizeInstagram'),
      {
        functionName: projectPrefix('authorizeInstagram'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/authorizeInstagram.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const authorizeInstagramIntegration = new apigateway.LambdaIntegration(
      authorizeInstagramHandler,
    );

    instagramAuthorizeApi.addMethod('GET', authorizeInstagramIntegration);

    // GET instagram/authorize/callback
    const authorizeInstagramCallbackHandler = new lambda.Function(
      this,
      projectPrefix('authorizeInstagramCallback'),
      {
        functionName: projectPrefix('authorizeInstagramCallback'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/authorizeInstagramCallback.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const authorizeInstagramCallbackIntegration = new apigateway.LambdaIntegration(
      authorizeInstagramCallbackHandler,
    );

    instagramAuthorizeCallbackApi.addMethod(
      'GET',
      authorizeInstagramCallbackIntegration,
    );
    userTable.grantReadWriteData(authorizeInstagramCallbackHandler);
    regionsTable.grantReadWriteData(authorizeInstagramCallbackHandler);
    trailsTable.grantReadWriteData(authorizeInstagramCallbackHandler);

    // webhook
    const webhooksApi = api.root.addResource('webhooks');
    webhooksApi.addCorsPreflight({ allowOrigins: ['*'] });

    // POST /webhooks
    const postWebhookHandler = new lambda.Function(
      this,
      projectPrefix('postWebhook'),
      {
        functionName: projectPrefix('postWebhook'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postWebhook.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const postWebhookIntegration = new apigateway.LambdaIntegration(
      postWebhookHandler,
    );

    webhooksApi.addMethod('POST', postWebhookIntegration);
    webhooksTable.grantReadWriteData(postWebhookHandler);
    regionsTable.grantReadData(postWebhookHandler);
    trailsTable.grantReadData(postWebhookHandler);

    // PUT /webhooks
    const putWebhookHandler = new lambda.Function(
      this,
      projectPrefix('putWebhook'),
      {
        functionName: projectPrefix('putWebhook'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/putWebhook.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const putWebhookIntegration = new apigateway.LambdaIntegration(
      putWebhookHandler,
    );

    webhooksApi.addMethod('PUT', putWebhookIntegration);
    webhooksTable.grantReadWriteData(putWebhookHandler);
    regionsTable.grantReadData(putWebhookHandler);
    trailsTable.grantReadData(putWebhookHandler);

    // DELETE /trails
    const deleteWebhookHandler = new lambda.Function(
      this,
      projectPrefix('deleteWebhook'),
      {
        functionName: projectPrefix('deleteWebhook'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/deleteWebhook.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const deleteWebhookIntegration = new apigateway.LambdaIntegration(
      deleteWebhookHandler,
    );

    webhooksApi.addMethod('DELETE', deleteWebhookIntegration);
    webhooksTable.grantReadWriteData(deleteWebhookHandler);
    regionsTable.grantReadData(deleteWebhookHandler);
    trailsTable.grantReadData(deleteWebhookHandler);

    // webhook/run
    const wehooksRunApi = webhooksApi.addResource('run');
    wehooksRunApi.addCorsPreflight({ allowOrigins: ['*'] });

    // POST /webhooks/run
    const postWebhookRunHandler = new lambda.Function(
      this,
      projectPrefix('postWebhookRun'),
      {
        functionName: projectPrefix('postWebhookRun'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postWebhookRun.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const postWebhookRunIntegration = new apigateway.LambdaIntegration(
      postWebhookRunHandler,
    );

    wehooksRunApi.addMethod('POST', postWebhookRunIntegration);
    webhooksTable.grantReadWriteData(postWebhookRunHandler);
    regionsTable.grantReadData(postWebhookRunHandler);
    regionStatusTable.grantReadData(postWebhookRunHandler);
    trailStatusTable.grantReadData(postWebhookRunHandler);
    trailsTable.grantReadData(postWebhookRunHandler);
    userTable.grantReadData(postWebhookRunHandler);

    // webhook-test
    const testWebhookApi = api.root.addResource('webhook-test');

    // POST and GET /webhook-test
    const testWebhookHandler = new lambda.Function(
      this,
      projectPrefix('testWebhook'),
      {
        functionName: projectPrefix('testWebhook'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/testWebhook.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const testWebhookIntegration = new apigateway.LambdaIntegration(
      testWebhookHandler,
    );

    testWebhookApi.addMethod('POST', testWebhookIntegration);
    testWebhookApi.addMethod('GET', testWebhookIntegration);

    // webhook-fcm
    const fcmWebhookApi = api.root.addResource('webhook-fcm');

    // POST /webhook-fcm
    const postFCMWebhookHandler = new lambda.Function(
      this,
      projectPrefix('postFCMWebhook'),
      {
        functionName: projectPrefix('postFCMWebhook'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postFCMWebhook.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(20),
        memorySize: 512,
      },
    );

    const postFCMWebhookIntegration = new apigateway.LambdaIntegration(
      postFCMWebhookHandler,
    );

    fcmWebhookApi.addMethod('POST', postFCMWebhookIntegration);

    // fcm-subscribe
    const fcmSubscribeApi = api.root.addResource('fcm-subscribe');
    fcmSubscribeApi.addCorsPreflight({ allowOrigins: ['*'] });

    // POST /fcm-subscribe
    const postFCMSubscribeHandler = new lambda.Function(
      this,
      projectPrefix('postFCMSubscribe'),
      {
        functionName: projectPrefix('postFCMSubscribe'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postFCMSubscribe.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(20),
        memorySize: 512,
      },
    );

    regionsTable.grantReadData(postFCMSubscribeHandler);

    const postFCMSubscribeIntegration = new apigateway.LambdaIntegration(
      postFCMSubscribeHandler,
    );

    fcmSubscribeApi.addMethod('POST', postFCMSubscribeIntegration);

    // fcm-unsubscribe
    const fcmUnsubscribeApi = api.root.addResource('fcm-unsubscribe');
    fcmUnsubscribeApi.addCorsPreflight({ allowOrigins: ['*'] });

    // POST /fcm-unsubscribe
    const postFCMUnsubscribeHandler = new lambda.Function(
      this,
      projectPrefix('postFCMUnsubscribe'),
      {
        functionName: projectPrefix('postFCMUnsubscribe'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postFCMUnsubscribe.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(20),
        memorySize: 512,
      },
    );

    regionsTable.grantReadData(postFCMUnsubscribeHandler);

    const postFCMUnsubscribeIntegration = new apigateway.LambdaIntegration(
      postFCMUnsubscribeHandler,
    );

    fcmUnsubscribeApi.addMethod('POST', postFCMUnsubscribeIntegration);

    // Schedules

    // Sync regions

    const scheduleSyncUsersRule = new events.Rule(
      this,
      projectPrefix('scheduleSyncUsersRule'),
      {
        schedule: events.Schedule.rate(
          cdk.Duration.minutes(parseInt(env('SYNC_FREQUENCY_MINUTES'), 10)),
        ),
      },
    );

    const scheduleSyncUsersHandler = new lambda.Function(
      this,
      projectPrefix('scheduleSyncUsers'),
      {
        functionName: projectPrefix('scheduleSyncUsers'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/scheduleSyncUsers.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    userTable.grantReadData(scheduleSyncUsersHandler);
    runSyncUsersQueue.grantSendMessages(scheduleSyncUsersHandler);

    scheduleSyncUsersRule.addTarget(
      new eventTargets.LambdaFunction(scheduleSyncUsersHandler),
    );

    // Jobs

    // Sync regions

    const runSyncUsersQueueEventSource = new SqsEventSource(runSyncUsersQueue, {
      // Set batch size to one. The runSyncUsers handler will be called for each region
      // to allow re-trying each individual one if one fails rather than the entire batch.
      batchSize: 1,
    });

    const runSyncUsersHandler = new lambda.Function(
      this,
      projectPrefix('runSyncUsers'),
      {
        functionName: projectPrefix('runSyncUsers'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/runSyncUsers.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(runSyncUsersHandlerTimeout),
        memorySize: 1024,
      },
    );

    runSyncUsersHandler.addEventSource(runSyncUsersQueueEventSource);
    regionsTable.grantReadData(runSyncUsersHandler);
    trailsTable.grantReadData(runSyncUsersHandler);
    regionStatusTable.grantReadWriteData(runSyncUsersHandler);
    regionStatusHistoryTable.grantReadWriteData(runSyncUsersHandler);
    trailStatusTable.grantReadWriteData(runSyncUsersHandler);
    webhooksTable.grantReadData(runSyncUsersHandler);
    userTable.grantReadWriteData(runSyncUsersHandler);
    runWebhooksQueue.grantSendMessages(runSyncUsersHandler);

    // Run webhooks

    const runWebhooksQueueEventSource = new SqsEventSource(runWebhooksQueue, {
      // Set batch size to one. The runWebhooks handler will be called for each webhook
      // to allow re-trying each individual one if one fails rather than the entire batch.
      batchSize: 1,
    });

    const runWebhooksHandler = new lambda.Function(
      this,
      projectPrefix('runWebhooks'),
      {
        functionName: projectPrefix('runWebhooks'),
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/runWebhooks.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(runSyncUsersHandlerTimeout),
        memorySize: 1024,
      },
    );

    runWebhooksHandler.addEventSource(runWebhooksQueueEventSource);
    webhooksTable.grantReadWriteData(runWebhooksHandler);
    regionsTable.grantReadData(runWebhooksHandler);
    regionStatusTable.grantReadData(runWebhooksHandler);
    trailStatusTable.grantReadData(runWebhooksHandler);
    trailsTable.grantReadData(runWebhooksHandler);
    userTable.grantReadData(runWebhooksHandler);
  }
}
