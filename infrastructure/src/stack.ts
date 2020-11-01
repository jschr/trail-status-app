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

    const webhookQueueDeadletter = new sqs.Queue(
      this,
      projectPrefix('webhook-jobs-deadletter'),
      {
        fifo: true,
        queueName: projectPrefix('webhook-jobs-deadletter.fifo'),
      },
    );

    const webhookQueue = new sqs.Queue(this, projectPrefix('webhook-jobs'), {
      fifo: true,
      queueName: projectPrefix('webhook-jobs.fifo'),
      contentBasedDeduplication: true,
      // Set to vibility timeout to 6 times the runWebhooks lambda timeout
      // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
      visibilityTimeout: cdk.Duration.seconds(6 * 15),
      deadLetterQueue: {
        queue: webhookQueueDeadletter,
        maxReceiveCount: 10,
      },
    });

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

    const apiEnvVars = {
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
      WEBHOOK_QUEUE_URL: webhookQueue.queueUrl,
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
        environment: apiEnvVars,
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
        environment: apiEnvVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const putRegionsIntegration = new apigateway.LambdaIntegration(
      putRegionsHandler,
    );

    regionsApi.addMethod('PUT', putRegionsIntegration);
    regionsTable.grantReadWriteData(putRegionsHandler);

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
        environment: apiEnvVars,
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
        environment: apiEnvVars,
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
        environment: apiEnvVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const putTrailsIntegration = new apigateway.LambdaIntegration(
      putTrailsHandler,
    );

    trailsApi.addMethod('PUT', putTrailsIntegration);
    trailsTable.grantReadWriteData(putTrailsHandler);

    // TODO: Remove when devices use new api
    // /status
    const trailStatusApi = api.root.addResource('status');
    trailStatusApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /status
    const getTrailStatusHandler = new lambda.Function(
      this,
      projectPrefix('getTrailStatus'),
      {
        functionName: projectPrefix('getTrailStatus'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getTrailStatus.default',
        environment: apiEnvVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const getTrailStatusIntegration = new apigateway.LambdaIntegration(
      getTrailStatusHandler,
    );

    trailStatusApi.addMethod('GET', getTrailStatusIntegration);
    trailStatusTable.grantReadData(getTrailStatusHandler);
    trailsTable.grantReadData(getTrailStatusHandler);
    userTable.grantReadData(getTrailStatusHandler);

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
        environment: apiEnvVars,
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
        environment: apiEnvVars,
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
        environment: apiEnvVars,
        timeout: cdk.Duration.seconds(10),
        memorySize: 512,
      },
    );

    const testWebhookIntegration = new apigateway.LambdaIntegration(
      testWebhookHandler,
    );

    webhookTestApi.addMethod('POST', testWebhookIntegration);

    // Schedules

    // Sync trail status

    const syncTrailStatusRule = new events.Rule(
      this,
      projectPrefix('syncTrailStatusRule'),
      {
        schedule: events.Schedule.rate(cdk.Duration.minutes(2)),
      },
    );

    const syncTrailStatusHandler = new lambda.Function(
      this,
      projectPrefix('syncTrailStatus'),
      {
        functionName: projectPrefix('syncTrailStatus'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/syncTrailStatus.default',
        environment: apiEnvVars,
        timeout: cdk.Duration.seconds(20),
        memorySize: 1024,
      },
    );

    trailStatusTable.grantReadWriteData(syncTrailStatusHandler);
    trailsTable.grantReadWriteData(syncTrailStatusHandler);
    userTable.grantReadWriteData(syncTrailStatusHandler);
    trailWebhooksTable.grantReadWriteData(syncTrailStatusHandler);
    webhookQueue.grantSendMessages(syncTrailStatusHandler);

    syncTrailStatusRule.addTarget(
      new eventTargets.LambdaFunction(syncTrailStatusHandler),
    );

    // Jobs

    // Run webhooks

    const webhookQueueEventSource = new SqsEventSource(webhookQueue, {
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
        environment: apiEnvVars,
        timeout: cdk.Duration.seconds(15),
        memorySize: 512,
      },
    );

    runWebhooksHandler.addEventSource(webhookQueueEventSource);
    trailWebhooksTable.grantReadWriteData(runWebhooksHandler);
    trailStatusTable.grantReadData(runWebhooksHandler);
  }
}
