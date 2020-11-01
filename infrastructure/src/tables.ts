import * as dynamodb from '@aws-cdk/aws-dynamodb';
import projectPrefix from './projectPrefix';

export default {
  users: {
    name: projectPrefix('users'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  },
  regions: {
    name: projectPrefix('regions'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    indexes: {
      regionsByUser: {
        name: 'regionsByUser',
        partitionKey: {
          name: 'userId',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'createdAt',
          type: dynamodb.AttributeType.STRING,
        },
      },
    },
  },
  trails: {
    name: projectPrefix('trails'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    indexes: {
      trailsByRegion: {
        name: 'trailsByRegion',
        partitionKey: {
          name: 'regionId',
          type: dynamodb.AttributeType.STRING,
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
  trailWebhooks: {
    name: projectPrefix('trailWebhooks'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    indexes: {
      webhooksByRegion: {
        name: 'webhooksByTrail',
        partitionKey: {
          name: 'trailId',
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
