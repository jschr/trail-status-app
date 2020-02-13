import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { env } from '@hydrocut-trail-status/utilities';

export default {
  trailStatus: {
    name: `${env('PROJECT')}-trailStatus`,
    partitionKey: { name: 'trailId', type: dynamodb.AttributeType.STRING }
  },
  trailAuth: {
    name: `${env('PROJECT')}-trailAuth`,
    partitionKey: { name: 'trailAuthId', type: dynamodb.AttributeType.STRING }
  }
};
