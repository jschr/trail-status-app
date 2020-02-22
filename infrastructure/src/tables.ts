import * as dynamodb from '@aws-cdk/aws-dynamodb';
import projectPrefix from './projectPrefix'

export default {
  trailStatus: {
    name: projectPrefix('trailStatus'),
    partitionKey: { name: 'trailId', type: dynamodb.AttributeType.STRING }
  },
  trailAuth: {
    name: projectPrefix('trailAuth'),
    partitionKey: { name: 'trailAuthId', type: dynamodb.AttributeType.STRING }
  },
  trailAuthSession: {
    name: projectPrefix('trailAuthSession'),
    partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING }
  }
};
