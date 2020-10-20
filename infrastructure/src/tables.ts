import * as dynamodb from '@aws-cdk/aws-dynamodb';
import projectPrefix from './projectPrefix';

export default {
  users: {
    name: projectPrefix('users'),
    partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  },
  trailSettings: {
    name: projectPrefix('trailSettings'),
    partitionKey: { name: 'trailId', type: dynamodb.AttributeType.STRING },
    indexes: {
      trailSync: {
        name: 'trailSync',
        partitionKey: {
          name: 'enableSync',
          type: dynamodb.AttributeType.NUMBER,
        },
        sortKey: {
          name: 'syncPriority',
          type: dynamodb.AttributeType.NUMBER,
        },
      },
    },
  },
  trailStatus: {
    name: projectPrefix('trailStatus'),
    partitionKey: { name: 'trailId', type: dynamodb.AttributeType.STRING },
  },
  webhooks: {
    name: projectPrefix('trailWebhooks'),
    partitionKey: { name: 'webhookId', type: dynamodb.AttributeType.STRING },
    indexes: {
      trailWebhooks: {
        name: 'trailWebhooks',
        partitionKey: {
          name: 'trailId',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'lastRanAt',
          type: dynamodb.AttributeType.STRING,
        },
      },
    },
  },
};
