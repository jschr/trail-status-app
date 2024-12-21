import projectPrefix from './projectPrefix';

export default {
  users: {
    name: projectPrefix('users'),
    partitionKey: { name: 'id', type: 'S' },
  },
  regions: {
    name: projectPrefix('regions'),
    partitionKey: { name: 'id', type: 'S' },
    indexes: {
      regionsByUser: {
        name: 'regionsByUser',
        partitionKey: {
          name: 'userId',
          type: 'S',
        },
        sortKey: {
          name: 'createdAt',
          type: 'S',
        },
      },
    },
  },
  regionStatus: {
    name: projectPrefix('regionStatus'),
    partitionKey: { name: 'id', type: 'S' },
  },
  trails: {
    name: projectPrefix('trails'),
    partitionKey: { name: 'id', type: 'S' },
    indexes: {
      trailsByRegion: {
        name: 'trailsByRegion',
        partitionKey: {
          name: 'regionId',
          type: 'S',
        },
        sortKey: {
          name: 'createdAt',
          type: 'S',
        },
      },
    },
  },
  trailStatus: {
    name: projectPrefix('trailStatus'),
    partitionKey: { name: 'id', type: 'S' },
  },
  webhooks: {
    name: projectPrefix('webhooks'),
    partitionKey: { name: 'id', type: 'S' },
    indexes: {
      webhooksByRegion: {
        name: 'webhooksByRegion',
        partitionKey: {
          name: 'regionId',
          type: 'S',
        },
        sortKey: {
          name: 'runPriority',
          type: 'N',
        },
      },
    },
  },
  regionStatusHistory: {
    name: projectPrefix('regionStatusHistory'),
    partitionKey: { name: 'id', type: 'S' },
    indexes: {
      regionStatusHistoryByRegion: {
        name: 'regionStatusHistoryByRegion',
        partitionKey: {
          name: 'regionId',
          type: 'S',
        },
        sortKey: {
          name: 'createdAt',
          type: 'S',
        },
      },
      regionStatusHistoryByInstagramPost: {
        name: 'regionStatusHistoryByInstagramPost',
        partitionKey: {
          name: 'instagramPostId',
          type: 'S',
        },
        sortKey: {
          name: 'createdAt',
          type: 'S',
        },
      },
    },
  },
};
