import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import ensureHashtagPrefix from './ensureHashtagPrefix';

export interface TrailSettings {
  id: string;
  name: string;
  regionId: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
}

export default class TrailSettingsModel {
  public static async get(id: string): Promise<TrailSettingsModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trailSettings.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailSettingsModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.get for id '${id}' failed with '${err.message}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<TrailSettingsModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
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
        item => TrailSettingsModels.find(tm => tm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `TrailSettingsModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${err.message}'`,
      );
    }
  }

  public static async getTrailSettingsByRegion(regionId: string) {
    try {
      const attrMap = this.toAttributeMap({ regionId });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.trailSettings.name,
        IndexName: tables.trailSettings.indexes.trailSettingsByRegion.name,
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
        `TrailSettingsModel.getTrailSettingsByRegion failed with '${err.message}'`,
      );
    }
  }

  private static toAttributeMap(trailSettings: Partial<TrailSettings>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (trailSettings.id !== undefined) attrMap.id = { S: trailSettings.id };
    if (trailSettings.regionId !== undefined)
      attrMap.regionId = { S: trailSettings.regionId };
    if (trailSettings.name !== undefined)
      attrMap.name = { S: trailSettings.name };
    if (trailSettings.closeHashtag !== undefined)
      attrMap.closeHashtag = { S: trailSettings.closeHashtag };
    if (trailSettings.updatedAt !== undefined)
      attrMap.updatedAt = { S: trailSettings.updatedAt };
    if (trailSettings.createdAt !== undefined)
      attrMap.createdAt = { S: trailSettings.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<TrailSettings> {
    if (!attrMap.id || !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      regionId: attrMap.regionId?.S,
      name: attrMap.name?.S,
      closeHashtag: attrMap.closeHashtag?.S,
      updatedAt: attrMap.updatedAt?.S,
      createdAt: attrMap.createdAt?.S,
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

  get id() {
    return this.attrs.id ?? '';
  }

  get regionId() {
    return this.attrs.regionId ?? '';
  }

  get name() {
    return this.attrs.name ?? '';
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

  public toJSON() {
    return {
      id: this.id,
      regionId: this.regionId,
      name: this.name,
      closeHashtag: this.closeHashtag,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
    };
  }
}
