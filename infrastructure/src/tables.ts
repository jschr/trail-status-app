import * as dynamodb from '@aws-cdk/aws-dynamodb';
import projectPrefix from './projectPrefix';

export default {
  users: {
    name: projectPrefix('users'),
    partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING }
  },
  trailStatus: {
    name: projectPrefix('trailStatus'),
    partitionKey: { name: 'trailId', type: dynamodb.AttributeType.STRING }
  }
};
