import { env } from '@trail-status-app/utilities';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

export default new DynamoDB({
  region: env('AWS_REGION'),
  endpoint: env('DYNAMO_ENDPOINT'),
});
