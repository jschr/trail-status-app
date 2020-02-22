import { env } from '@trail-status-app/utilities';
import * as AWS from 'aws-sdk';

export default new AWS.DynamoDB({
  region: env('AWS_REGION'),
  endpoint: env('DYNAMO_ENDPOINT')
});
