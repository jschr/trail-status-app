import { env } from '@hydrocut-trail-status/utilities';
import * as AWS from 'aws-sdk';

export default new AWS.DynamoDB({
  region: env('AWS_REGION'),
  endpoint: env('DYNAMO_ENDPOINT')
});
