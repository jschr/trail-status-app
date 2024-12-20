import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
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
  regionStatus: {
    name: projectPrefix('regionStatus'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
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
  regionStatusHistory: {
    name: projectPrefix('regionStatusHistory'),
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    indexes: {
      regionStatusHistoryByRegion: {
        name: 'regionStatusHistoryByRegion',
        partitionKey: {
          name: 'regionId',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'createdAt',
          type: dynamodb.AttributeType.STRING,
        },
      },
      regionStatusHistoryByInstagramPost: {
        name: 'regionStatusHistoryByInstagramPost',
        partitionKey: {
          name: 'instagramPostId',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'createdAt',
          type: dynamodb.AttributeType.STRING,
        },
      },
    },
  },
};
