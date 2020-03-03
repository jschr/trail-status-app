import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface TrailSettings {
  trailId: string;
  userId: string;
  openHashtag: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
  lastSyncdAt: string;
  syncPriority: number;
  enableSync: number;
}

const ensureHashtagPrefix = (value: string) => {
  if (value.charAt(0) === '#') return value;
  return `#${value}`;
};

export default class TrailSettingsModel {
  public static async get(trailId: string): Promise<TrailSettingsModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trailSettings.name,
        Key: this.toAttributeMap({ trailId }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailSettingsModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.get for trailId '${trailId}' failed with '${err.message}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      trailId: string;
    }>,
  ): Promise<Array<TrailSettingsModel | null>> {
    const requestKeys = items.filter(i => i.trailId).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trailSettings.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.trailSettings.name];
      if (!tableResults) {
        return [];
      }

      const TrailSettingsModels = tableResults.map(
        attrMap => new TrailSettingsModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item =>
          TrailSettingsModels.find(tm => tm.trailId === item.trailId) ?? null,
      );
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${err.message}'`,
      );
    }
  }

  public static async getNextBatchToSync() {
    try {
      const attrMap = this.toAttributeMap({ enableSync: 1 });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.trailSettings.name,
        IndexName: tables.trailSettings.indexes.trailSync.name,
        KeyConditionExpression: '#enableSync = :enableSync',
        ExpressionAttributeNames: {
          '#enableSync': 'enableSync',
        },
        ExpressionAttributeValues: {
          ':enableSync': attrMap.enableSync,
        },
        ScanIndexForward: false,
        Limit: 100,
      };

      const res = await dynamodb.query(params).promise();

      return res.Items
        ? res.Items.map(
            item => new TrailSettingsModel(this.fromAttributeMap(item)),
          )
        : [];
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.getNextBatchToSync failed with '${err.message}'`,
      );
    }
  }

  private static toAttributeMap(trailSettings: Partial<TrailSettings>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (trailSettings.trailId !== undefined)
      attrMap.trailId = { S: trailSettings.trailId };
    if (trailSettings.userId !== undefined)
      attrMap.userId = { S: trailSettings.userId };
    if (trailSettings.openHashtag !== undefined)
      attrMap.openHashtag = { S: trailSettings.openHashtag };
    if (trailSettings.closeHashtag !== undefined)
      attrMap.closeHashtag = { S: trailSettings.closeHashtag };
    if (trailSettings.updatedAt !== undefined)
      attrMap.updatedAt = { S: trailSettings.updatedAt };
    if (trailSettings.createdAt !== undefined)
      attrMap.createdAt = { S: trailSettings.createdAt };
    if (trailSettings.lastSyncdAt !== undefined)
      attrMap.lastSyncdAt = { S: trailSettings.lastSyncdAt };
    if (trailSettings.syncPriority !== undefined)
      attrMap.syncPriority = { N: String(trailSettings.syncPriority) };
    if (trailSettings.enableSync !== undefined)
      attrMap.enableSync = { N: String(trailSettings.enableSync) };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<TrailSettings> {
    if (!attrMap.trailId || !attrMap.trailId.S)
      throw new Error('Missing trailId parsing attribute map');

    return {
      trailId: attrMap.trailId?.S,
      userId: attrMap.userId?.S,
      openHashtag: attrMap.openHashtag?.S,
      closeHashtag: attrMap.closeHashtag?.S,
      updatedAt: attrMap.updatedAt?.S,
      createdAt: attrMap.createdAt?.S,
      lastSyncdAt: attrMap.lastSyncdAt?.S,
      syncPriority: Number(attrMap.syncPriority?.N),
      enableSync: Number(attrMap.enableSync?.N),
    };
  }

  constructor(private attrs: Partial<TrailSettings>) {}

  public async save(updatedAttrs: Partial<TrailSettings> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };

    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.trailSettings.name,
      Item: TrailSettingsModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${err.message}'`,
      );
    }
  }

  get trailId() {
    return this.attrs.trailId ?? '';
  }

  get userId() {
    return this.attrs.userId ?? '';
  }

  get openHashtag() {
    return ensureHashtagPrefix(this.attrs.openHashtag ?? '');
  }

  get closeHashtag() {
    return ensureHashtagPrefix(this.attrs.closeHashtag ?? '');
  }

  get updatedAt() {
    return this.attrs.updatedAt ?? '';
  }

  get createdAt() {
    return this.attrs.createdAt ?? '';
  }

  get lastSyncdAt() {
    return this.attrs.lastSyncdAt ?? '';
  }

  get syncPriority() {
    return this.attrs.syncPriority ?? 0;
  }

  get enableSync() {
    return this.attrs.enableSync ?? 0;
  }

  public toJSON() {
    return {
      trailId: this.trailId,
      userId: this.userId,
      openHashtag: this.openHashtag,
      closeHashtag: this.closeHashtag,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
      lastSyncdAt: this.lastSyncdAt,
      syncPriority: this.syncPriority,
      enableSync: this.enableSync,
    };
  }
}
