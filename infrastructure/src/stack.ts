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

    // Set to vibility timeout to 6 times the runWebhooks lambda timeout
    // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
    const runSyncRegionsHandlerTimeout = 15;
    const runSyncRegionsQueue = new sqs.Queue(
      this,
      projectPrefix('runSyncRegionsJob'),
      {
        fifo: true,
        queueName: projectPrefix('runSyncRegionsJob.fifo'),
        contentBasedDeduplication: true,
        // Set to vibility timeout to 6 times the runWebhooks lambda timeout
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
      RUN_SYNC_REGIONS_QUEUE_URL: runSyncRegionsQueue.queueUrl,
      RUN_WEBHOOKS_QUEUE_URL: runWebhooksQueue.queueUrl,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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
    const getRegiontatusHandler = new lambda.Function(
      this,
      projectPrefix('getRegiontatus'),
      {
        functionName: projectPrefix('getRegiontatus'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getRegiontatus.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getRegiontatusIntegration = new apigateway.LambdaIntegration(
      getRegiontatusHandler,
    );

    regionStatusApi.addMethod('GET', getRegiontatusIntegration);
    regionsTable.grantReadData(getRegiontatusHandler);
    regionStatusTable.grantReadData(getRegiontatusHandler);
    trailsTable.grantReadData(getRegiontatusHandler);
    trailStatusTable.grantReadData(getRegiontatusHandler);
    userTable.grantReadData(getRegiontatusHandler);

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
    const postTrailHandler = new lambda.Function(
      this,
      projectPrefix('postTrail'),
      {
        functionName: projectPrefix('postTrail'),
        runtime: lambda.Runtime.NODEJS_12_X,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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

    // webhook
    const webhooksApi = api.root.addResource('webhooks');

    // POST /webhooks
    const postWebhook = new lambda.Function(
      this,
      projectPrefix('postWebhook'),
      {
        functionName: projectPrefix('postWebhook'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/postWebhook.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const postWebhookIntegration = new apigateway.LambdaIntegration(
      postWebhook,
    );

    webhooksApi.addMethod('POST', postWebhookIntegration);
    webhooksTable.grantReadWriteData(postWebhook);
    regionsTable.grantReadData(postWebhook);
    trailsTable.grantReadData(postWebhook);

    // PUT /webhooks
    const putWebhookHandler = new lambda.Function(
      this,
      projectPrefix('putWebhook'),
      {
        functionName: projectPrefix('putWebhook'),
        runtime: lambda.Runtime.NODEJS_12_X,
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
        runtime: lambda.Runtime.NODEJS_12_X,
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

    // POST /webhooks
    const postWebhookRunHandler = new lambda.Function(
      this,
      projectPrefix('postWebhookRun'),
      {
        functionName: projectPrefix('postWebhookRun'),
        runtime: lambda.Runtime.NODEJS_12_X,
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

    // Test webhook
    const webhookTestApi = api.root.addResource('webhook-test');

    // POST and GET /webhook-test
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
    webhookTestApi.addMethod('GET', testWebhookIntegration);

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
    webhooksTable.grantReadData(runSyncRegionsHandler);
    userTable.grantReadWriteData(runSyncRegionsHandler);
    runWebhooksQueue.grantSendMessages(runSyncRegionsHandler);

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
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/runWebhooks.default',
        environment: envVars,
        timeout: cdk.Duration.seconds(runSyncRegionsHandlerTimeout),
        memorySize: 1024,
      },
    );

    runWebhooksHandler.addEventSource(runWebhooksQueueEventSource);
    webhooksTable.grantReadWriteData(runWebhooksHandler);
    regionsTable.grantReadData(runWebhooksHandler);
    regionStatusTable.grantReadData(runWebhooksHandler);
    trailStatusTable.grantReadData(runWebhooksHandler);
    trailsTable.grantReadData(runWebhooksHandler);
  }
}
