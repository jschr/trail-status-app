import { env } from '@trail-status-app/utilities';
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53Targets from '@aws-cdk/aws-route53-targets';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import path from 'path';
import tables from './tables';
import projectPrefix from './projectPrefix';

const packagePath = path.join(__dirname, '../../tmp/package.zip');

export default class extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Database
    const userTable = new dynamodb.Table(this, tables.users.name, {
      tableName: tables.users.name,
      partitionKey: tables.users.partitionKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN
    });

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
            : cdk.RemovalPolicy.RETAIN
      }
    );

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
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      projectPrefix('zone'),
      {
        hostedZoneId: env('HOSTED_ZONE_ID'),
        zoneName: env('TLD')
      }
    );

    const sslCertificate = acm.Certificate.fromCertificateArn(
      this,
      projectPrefix('ssl'),
      env('SSL_ARN')
    );

    const api = new apigateway.RestApi(this, projectPrefix('api'), {
      domainName: {
        domainName: `${env('API_SUBDOMAIN')}.${env('TLD')}`,
        certificate: sslCertificate
      },
      deployOptions: { stageName: 'stage' }
    });

    new route53.ARecord(this, projectPrefix('api-record'), {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api)
      ),
      recordName: env('API_SUBDOMAIN')
    });

    // /status
    const trailStatusApi = api.root.addResource('status');

    // GET /status
    const getTrailStatusHandler = new lambda.Function(
      this,
      projectPrefix('getTrailStatus'),
      {
        functionName: projectPrefix('getTrailStatus'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/getTrailStatus.default',
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

    // instagram
    const instagramApi = api.root.addResource('instagram');
    const instagramAuthorizeApi = instagramApi.addResource('authorize');
    const instagramAuthorizeCallbackApi = instagramAuthorizeApi.addResource(
      'callback'
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
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT'),
          INSTAGRAM_APP_ID: env('INSTAGRAM_APP_ID'),
          INSTAGRAM_APP_SECRET: env('INSTAGRAM_APP_SECRET')
        }
      }
    );

    const authorizeInstagramIntegration = new apigateway.LambdaIntegration(
      authorizeInstagramHandler
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
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT'),
          INSTAGRAM_APP_ID: env('INSTAGRAM_APP_ID'),
          INSTAGRAM_APP_SECRET: env('INSTAGRAM_APP_SECRET')
        }
      }
    );

    const authorizeInstagramCallbackIntegration = new apigateway.LambdaIntegration(
      authorizeInstagramCallbackHandler
    );

    instagramAuthorizeCallbackApi.addMethod(
      'GET',
      authorizeInstagramCallbackIntegration
    );
    userTable.grantReadWriteData(authorizeInstagramCallbackHandler);
    trailSettingsTable.grantReadWriteData(authorizeInstagramCallbackHandler);
  }
}
