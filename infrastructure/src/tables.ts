import * as dynamodb from '@aws-cdk/aws-dynamodb';
import projectPrefix from './projectPrefix';

export default {
  users: {
    name: projectPrefix('users'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  },
  regions: {
    name: projectPrefix('region'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  },
  trails: {
    name: projectPrefix('trail'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    indexes: {
      trailsByRegion: {
        name: 'trailsByRegion',
        partitionKey: {
          name: 'regionId',
          type: dynamodb.AttributeType.NUMBER,
        },
        sortKey: {
          name: 'createdAt',
          type: dynamodb.AttributeType.STRING,
        },
      },
    },
  },
  // TODO: Move this into trails table?
  trailStatus: {
    name: projectPrefix('trailStatus'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  },
  webhooks: {
    name: projectPrefix('webhooks'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    indexes: {
      webhooksByRegion: {
        name: 'webhooksByRegion',
        partitionKey: {
          name: 'regionId',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'runPriority',
          type: dynamodb.AttributeType.NUMBER,
        },
      },
    },
  },
};
