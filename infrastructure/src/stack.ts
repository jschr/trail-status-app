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
import path from 'path';
import tables from './tables';
import projectPrefix from './projectPrefix';
import { Duration } from '@aws-cdk/core';

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

    // Trail settings table
    const trailSettingsTable = new dynamodb.Table(
      this,
      tables.trailSettings.name,
      {
        tableName: tables.trailSettings.name,
        partitionKey: tables.trailSettings.partitionKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy:
          env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
            ? cdk.RemovalPolicy.DESTROY
            : cdk.RemovalPolicy.RETAIN,
      },
    );

    const trailSyncIndex = tables.trailSettings.indexes.trailSync;
    trailSettingsTable.addGlobalSecondaryIndex({
      indexName: trailSyncIndex.name,
      partitionKey: trailSyncIndex.partitionKey,
      sortKey: trailSyncIndex.sortKey,
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
    };

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
      },
    );

    const getTrailStatusIntegration = new apigateway.LambdaIntegration(
      getTrailStatusHandler,
    );

    trailStatusApi.addMethod('GET', getTrailStatusIntegration);
    trailStatusTable.grantReadData(getTrailStatusHandler);
    trailSettingsTable.grantReadData(getTrailStatusHandler);
    userTable.grantReadData(getTrailStatusHandler);

    // /settings
    const trailSettingsApi = api.root.addResource('settings');
    trailSettingsApi.addCorsPreflight({ allowOrigins: ['*'] });

    // GET /settings
    const getTrailSettingsHandler = new lambda.Function(
      this,
      projectPrefix('getTrailSettings'),
      {
        functionName: projectPrefix('getTrailSettings'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getTrailSettings.default',
        environment: apiEnvVars,
      },
    );

    const getTrailSettingsIntegration = new apigateway.LambdaIntegration(
      getTrailSettingsHandler,
    );

    trailSettingsApi.addMethod('GET', getTrailSettingsIntegration);
    trailSettingsTable.grantReadData(getTrailSettingsHandler);

    // PUT /settings
    const putTrailSettingsHandler = new lambda.Function(
      this,
      projectPrefix('putTrailSettings'),
      {
        functionName: projectPrefix('putTrailSettings'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/putTrailSettings.default',
        environment: apiEnvVars,
      },
    );

    const putTrailSettingsIntegration = new apigateway.LambdaIntegration(
      putTrailSettingsHandler,
    );

    trailSettingsApi.addMethod('PUT', putTrailSettingsIntegration);
    trailSettingsTable.grantReadWriteData(putTrailSettingsHandler);

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
    trailSettingsTable.grantReadWriteData(authorizeInstagramCallbackHandler);

    // Schedules

    // Sync trail status

    const syncTrailStatusRule = new events.Rule(
      this,
      projectPrefix('syncTrailStatusRule'),
      {
        schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
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
        timeout: Duration.seconds(10),
      },
    );

    trailStatusTable.grantReadWriteData(syncTrailStatusHandler);
    trailSettingsTable.grantReadWriteData(syncTrailStatusHandler);
    userTable.grantReadData(syncTrailStatusHandler);

    syncTrailStatusRule.addTarget(
      new eventTargets.LambdaFunction(syncTrailStatusHandler),
    );
  }
}
