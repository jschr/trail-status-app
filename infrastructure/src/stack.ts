import { env } from '@trail-status-app/utilities';
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53Targets from '@aws-cdk/aws-route53-targets';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as eventTargets from '@aws-cdk/aws-events-targets';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as sqs from '@aws-cdk/aws-sqs';
import path from 'path';
import tables from './tables';
import projectPrefix from './projectPrefix';

const packagePath = path.join(__dirname, '../../tmp/package.zip');

export default class extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
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
    const trailWebhooksTable = new dynamodb.Table(
      this,
      tables.trailWebhooks.name,
      {
        tableName: tables.trailWebhooks.name,
        partitionKey: tables.trailWebhooks.partitionKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy:
          env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
            ? cdk.RemovalPolicy.DESTROY
            : cdk.RemovalPolicy.RETAIN,
      },
    );

    const trailWebhooksByRegionIndex =
      tables.trailWebhooks.indexes.webhooksByRegion;
    trailWebhooksTable.addGlobalSecondaryIndex({
      indexName: trailWebhooksByRegionIndex.name,
      partitionKey: trailWebhooksByRegionIndex.partitionKey,
      sortKey: trailWebhooksByRegionIndex.sortKey,
    });

    // Queues

    // Sync regions

    const runSyncRegionsDeadletter = new sqs.Queue(
      this,
      projectPrefix('runSyncRegionsJobDeadletter'),
      {
        fifo: true,
        queueName: projectPrefix('runSyncRegionsJobDeadletter.fifo'),
      },
    );

    // Set to vibility timeout to 6 times the runTrailWebhooks lambda timeout
    // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
    const runSyncRegionsHandlerTimeout = 15;
    const runSyncRegionsQueue = new sqs.Queue(
      this,
      projectPrefix('runSyncRegionsJob'),
      {
        fifo: true,
        queueName: projectPrefix('runSyncRegionsJob.fifo'),
        contentBasedDeduplication: true,
        // Set to vibility timeout to 6 times the runTrailWebhooks lambda timeout
        // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
        visibilityTimeout: cdk.Duration.seconds(
          6 * runSyncRegionsHandlerTimeout,
        ),
        deadLetterQueue: {
          queue: runSyncRegionsDeadletter,
          maxReceiveCount: 10,
        },
      },
    );

    // Trail webhooks

    const runTrailWebhooksDeadletter = new sqs.Queue(
      this,
      projectPrefix('runTrailWebhooksJobDeadletter'),
      {
        fifo: true,
        queueName: projectPrefix('runTrailWebhooksJobDeadletter.fifo'),
      },
    );

    // Set to vibility timeout to 6 times the runTrailWebhooks lambda timeout
    // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
    const runTrailWebhooksHandlerTimeout = 15;
    const runTrailWebhooksQueue = new sqs.Queue(
      this,
      projectPrefix('runTrailWebhooksJob'),
      {
        fifo: true,
        queueName: projectPrefix('runTrailWebhooksJob.fifo'),
        contentBasedDeduplication: true,

        visibilityTimeout: cdk.Duration.seconds(
          6 * runTrailWebhooksHandlerTimeout,
        ),
        deadLetterQueue: {
          queue: runTrailWebhooksDeadletter,
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
      RUN_SYNC_REGIONS_QUEUE_URL: runSyncRegionsQueue.queueUrl,
      RUN_TRAIL_WEBHOOKS_QUEUE_URL: runTrailWebhooksQueue.queueUrl,
    };

    // /regions
    const regionsApi = api.root.addResource('regions');
    regionsApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /regions
    const getRegionsHandler = new lambda.Function(
      this,
      projectPrefix('getRegions'),
      {
        functionName: projectPrefix('getRegions'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getRegions.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getRegionsIntegration = new apigateway.LambdaIntegration(
      getRegionsHandler,
    );

    regionsApi.addMethod('GET', getRegionsIntegration);
    regionsTable.grantReadData(getRegionsHandler);
    trailsTable.grantReadData(getRegionsHandler);
    userTable.grantReadData(getRegionsHandler);

    // PUT /regions
    const putRegionsHandler = new lambda.Function(
      this,
      projectPrefix('putRegions'),
      {
        functionName: projectPrefix('putRegions'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/putRegions.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const putRegionsIntegration = new apigateway.LambdaIntegration(
      putRegionsHandler,
    );

    regionsApi.addMethod('PUT', putRegionsIntegration);
    regionsTable.grantReadWriteData(putRegionsHandler);

    // /regions/status
    const regionStatusApi = regionsApi.addResource('status');
    regionStatusApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /regions/status
    const getRegionStatusHandler = new lambda.Function(
      this,
      projectPrefix('getRegionStatus'),
      {
        functionName: projectPrefix('getRegionStatus'),
        runtime: lambda.Runtime.NODEJS_12_X,
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

    // /trails
    const trailsApi = api.root.addResource('trails');
    trailsApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /trails
    const getTrailsHandler = new lambda.Function(
      this,
      projectPrefix('getTrails'),
      {
        functionName: projectPrefix('getTrails'),
        runtime: lambda.Runtime.NODEJS_12_X,
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
    const postTrailsHandler = new lambda.Function(
      this,
      projectPrefix('postTrails'),
      {
        functionName: projectPrefix('postTrails'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postTrails.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const postTrailsIntegration = new apigateway.LambdaIntegration(
      postTrailsHandler,
    );

    trailsApi.addMethod('POST', postTrailsIntegration);
    trailsTable.grantReadWriteData(postTrailsHandler);

    // PUT /trails
    const putTrailsHandler = new lambda.Function(
      this,
      projectPrefix('putTrails'),
      {
        functionName: projectPrefix('putTrails'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/putTrails.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const putTrailsIntegration = new apigateway.LambdaIntegration(
      putTrailsHandler,
    );

    trailsApi.addMethod('PUT', putTrailsIntegration);
    trailsTable.grantReadWriteData(putTrailsHandler);

    // /trails/status
    const trailStatusApi = trailsApi.addResource('status');
    trailStatusApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /trails/status
    const getTrailStatusHandler = new lambda.Function(
      this,
      projectPrefix('getTrailStatus'),
      {
        functionName: projectPrefix('getTrailStatus'),
        runtime: lambda.Runtime.NODEJS_12_X,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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
    trailsTable.grantReadWriteData(authorizeInstagramCallbackHandler);

    // Test webhook
    const webhookTestApi = api.root.addResource('webhook-test');

    // POST /webhook-test
    const testWebhookHandler = new lambda.Function(
      this,
      projectPrefix('testWebhook'),
      {
        functionName: projectPrefix('testWebhook'),
        runtime: lambda.Runtime.NODEJS_12_X,
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

    webhookTestApi.addMethod('POST', testWebhookIntegration);

    // Schedules

    // Sync regions

    const scheduleSyncRegionsRule = new events.Rule(
      this,
      projectPrefix('scheduleSyncRegionsRule'),
      {
        schedule: events.Schedule.rate(cdk.Duration.minutes(2)),
      },
    );

    const scheduleSyncRegionsHandler = new lambda.Function(
      this,
      projectPrefix('scheduleSyncRegions'),
      {
        functionName: projectPrefix('scheduleSyncRegions'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/scheduleSyncRegions.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    regionsTable.grantReadData(scheduleSyncRegionsHandler);
    runSyncRegionsQueue.grantSendMessages(scheduleSyncRegionsHandler);

    scheduleSyncRegionsRule.addTarget(
      new eventTargets.LambdaFunction(scheduleSyncRegionsHandler),
    );

    // Jobs

    // Sync regions

    const runSyncRegionsQueueEventSource = new SqsEventSource(
      runSyncRegionsQueue,
      {
        // Set batch size to one. The runSyncRegions handler will be called for each region
        // to allow re-trying each individual one if one fails rather than the entire batch.
        batchSize: 1,
      },
    );

    const runSyncRegionsHandler = new lambda.Function(
      this,
      projectPrefix('runSyncRegions'),
      {
        functionName: projectPrefix('runSyncRegions'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/runSyncRegions.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(runSyncRegionsHandlerTimeout),
        memorySize: 1024,
      },
    );

    runSyncRegionsHandler.addEventSource(runSyncRegionsQueueEventSource);
    regionsTable.grantReadData(runSyncRegionsHandler);
    trailsTable.grantReadData(runSyncRegionsHandler);
    regionStatusTable.grantReadWriteData(runSyncRegionsHandler);
    trailStatusTable.grantReadWriteData(runSyncRegionsHandler);
    trailWebhooksTable.grantReadData(runSyncRegionsHandler);
    userTable.grantReadWriteData(runSyncRegionsHandler);

    // Run webhooks

    const runTrailWebhookQueueEventSource = new SqsEventSource(
      runTrailWebhooksQueue,
      {
        // Set batch size to one. The runTrailWebhooks handler will be called for each webhook
        // to allow re-trying each individual one if one fails rather than the entire batch.
        batchSize: 1,
      },
    );

    const runTrailWebhooksHandler = new lambda.Function(
      this,
      projectPrefix('runTrailWebhooks'),
      {
        functionName: projectPrefix('runTrailWebhooks'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/runTrailWebhooks.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(runSyncRegionsHandlerTimeout),
        memorySize: 1024,
      },
    );

    runTrailWebhooksHandler.addEventSource(runTrailWebhookQueueEventSource);
    trailWebhooksTable.grantReadWriteData(runTrailWebhooksHandler);
    trailStatusTable.grantReadData(runTrailWebhooksHandler);
  }
}
