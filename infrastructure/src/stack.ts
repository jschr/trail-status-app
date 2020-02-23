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

    const trailAuthSessionTable = new dynamodb.Table(
      this,
      tables.trailAuthSession.name,
      {
        tableName: tables.trailAuthSession.name,
        partitionKey: tables.trailAuthSession.partitionKey,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy:
          env('USER_RESOURCE_REMOVAL_POLICY') === 'destroy'
            ? cdk.RemovalPolicy.DESTROY
            : cdk.RemovalPolicy.RETAIN
      }
    );

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

    // PUT /status
    const updateTrailStatusHandler = new lambda.Function(
      this,
      projectPrefix('updateTrailStatus'),
      {
        functionName: projectPrefix('updateTrailStatus'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/updateTrailStatus.default',
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
      projectPrefix('authorizeTwitter'),
      {
        functionName: projectPrefix('authorizeTwitter'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/authorizeTwitter.default',
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
    trailAuthSessionTable.grantReadWriteData(authorizeTwitterHandler);

    // GET twitter/authorize/callback
    const authorizeTwitterCallbackHandler = new lambda.Function(
      this,
      projectPrefix('authorizeTwitterCallback'),
      {
        functionName: projectPrefix('authorizeTwitterCallback'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/authorizeTwitterCallback.default',
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
    trailAuthSessionTable.grantReadWriteData(authorizeTwitterCallbackHandler);

    // facebook
    const facebookApi = api.root.addResource('facebook');
    const facebookAuthorizeApi = facebookApi.addResource('authorize');
    const facebookAuthorizeCallbackApi = facebookAuthorizeApi.addResource(
      'callback'
    );

    // GET /facebook/authorize
    const authorizeFacebookHandler = new lambda.Function(
      this,
      projectPrefix('authorizeFacebook'),
      {
        functionName: projectPrefix('authorizeFacebook'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/authorizeFacebook.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT'),
          FACEBOOK_APP_ID: env('FACEBOOK_APP_ID'),
          FACEBOOK_APP_SECRET: env('FACEBOOK_APP_SECRET')
        }
      }
    );

    const authorizeFacebookIntegration = new apigateway.LambdaIntegration(
      authorizeFacebookHandler
    );

    facebookAuthorizeApi.addMethod('GET', authorizeFacebookIntegration);
    trailAuthTable.grantReadWriteData(authorizeFacebookHandler);
    trailAuthSessionTable.grantReadWriteData(authorizeFacebookHandler);

    // GET facebook/authorize/callback
    const authorizeFacebookCallbackHandler = new lambda.Function(
      this,
      projectPrefix('authorizeFacebookCallback'),
      {
        functionName: projectPrefix('authorizeFacebookCallback'),
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset(packagePath),
        handler: 'api/build/src/handlers/authorizeFacebookCallback.default',
        environment: {
          PROJECT: env('PROJECT'),
          DYNAMO_ENDPOINT: env('DYNAMO_ENDPOINT'),
          API_ENDPOINT: env('API_ENDPOINT'),
          FACEBOOK_APP_ID: env('FACEBOOK_APP_ID'),
          FACEBOOK_APP_SECRET: env('FACEBOOK_APP_SECRET')
        }
      }
    );

    const authorizeFacebookCallbackIntegration = new apigateway.LambdaIntegration(
      authorizeFacebookCallbackHandler
    );

    facebookAuthorizeCallbackApi.addMethod(
      'GET',
      authorizeFacebookCallbackIntegration
    );
    trailAuthTable.grantReadWriteData(authorizeFacebookCallbackHandler);
    trailAuthSessionTable.grantReadWriteData(authorizeFacebookCallbackHandler);
  }
}
