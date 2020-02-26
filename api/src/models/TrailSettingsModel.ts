import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface TrailSettings {
  trailId: string;
  openHashtag: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
}

export default class TrailSettingsModel {
  public static async get(trailId: string): Promise<TrailSettingsModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trailSettings.name,
        Key: this.toAttributeMap({ trailId })
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailSettingsModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.get for trailId '${trailId}' failed with '${err.message}'`
      );
    }
  }

  public static async batchGet(
    items: Array<{
      trailId: string;
    }>
  ): Promise<Array<TrailSettingsModel | null>> {
    const requestKeys = items.filter(i => i.trailId).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trailSettings.name]: {
          Keys: requestKeys
        }
      }
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
        attrMap => new TrailSettingsModel(this.fromAttributeMap(attrMap))
      );

      return items.map(
        item =>
          TrailSettingsModels.find(tm => tm.trailId === item.trailId) || null
      );
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.batchGet with params '${JSON.stringify(
          params
        )}' failed with '${err.message}'`
      );
    }
  }

  private static toAttributeMap(trailSettings: Partial<TrailSettings>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (trailSettings.trailId !== undefined)
      attrMap.trailId = { S: trailSettings.trailId };
    if (trailSettings.openHashtag !== undefined)
      attrMap.openHashtag = { S: trailSettings.openHashtag };
    if (trailSettings.closeHashtag !== undefined)
      attrMap.closeHashtag = { S: trailSettings.closeHashtag };
    if (trailSettings.updatedAt !== undefined)
      attrMap.updatedAt = { S: trailSettings.updatedAt };
    if (trailSettings.createdAt !== undefined)
      attrMap.createdAt = { S: trailSettings.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap
  ): Partial<TrailSettings> {
    if (!attrMap.trailId || !attrMap.trailId.S)
      throw new Error('Missing trailId parsing attribute map');

    return {
      trailId: attrMap.trailId?.S,
      openHashtag: attrMap.openHashtag?.S,
      closeHashtag: attrMap.closeHashtag?.S,
      updatedAt: attrMap.updatedAt?.S,
      createdAt: attrMap.createdAt?.S
    };
  }

  constructor(private attrs: Partial<TrailSettings>) {}

  public async save(updatedAttrs: Partial<TrailSettings> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString()
    };
    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.trailSettings.name,
      Item: TrailSettingsModel.toAttributeMap(newAttrs)
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.save failed for Item '${JSON.stringify(
          params.Item
        )}' with '${err.message}'`
      );
    }
  }

  get trailId() {
    return this.attrs.trailId || '';
  }

  get openHashtag() {
    return this.attrs.openHashtag || '';
  }

  get closeHashtag() {
    return this.attrs.closeHashtag || '';
  }

  get updatedAt() {
    return this.attrs.updatedAt || '';
  }

  get createdAt() {
    return this.attrs.createdAt || '';
  }

  public toJSON() {
    return {
      trailId: this.trailId,
      openHashtag: this.openHashtag,
      closeHashtag: this.closeHashtag,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt
    };
  }
}
