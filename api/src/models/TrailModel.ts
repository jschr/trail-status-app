import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import ensureHashtagPrefix from './ensureHashtagPrefix';

export interface Trail {
  id: string;
  name: string;
  regionId: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
}

export default class TrailModel {
  public static async get(id: string): Promise<TrailModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trails.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailModel.get for id '${id}' failed with '${err.message}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<TrailModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trails.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.trails.name];
      if (!tableResults) {
        return [];
      }

      const trailModels = tableResults.map(
        attrMap => new TrailModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item => trailModels.find(tm => tm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `TrailModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${err.message}'`,
      );
    }
  }

  public static async queryByRegion(
    regionId: string,
    exclusiveStartKey?: AWS.DynamoDB.Key | undefined,
  ): Promise<[TrailModel[], AWS.DynamoDB.Key | undefined]> {
    try {
      const attrMap = this.toAttributeMap({ regionId });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.trails.name,
        IndexName: tables.trails.indexes.trailsByRegion.name,
        KeyConditionExpression: '#regionId = :regionId',
        ExpressionAttributeNames: {
          '#regionId': 'regionId',
        },
        ExpressionAttributeValues: {
          ':regionId': attrMap.regionId,
        },
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      };

      const res = await dynamodb.query(params).promise();

      const trails = res.Items
        ? res.Items.map(item => new TrailModel(this.fromAttributeMap(item)))
        : [];

      return [trails, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(`TrailModel.queryByRegion failed with '${err.message}'`);
    }
  }

  public static async allByRegion(regionId: string): Promise<TrailModel[]> {
    const allTrailsByRegion: TrailModel[] = [];

    let [regions, lastEvaluatedKey] = await TrailModel.queryByRegion(regionId);
    allTrailsByRegion.push(...regions);

    while (lastEvaluatedKey) {
      [regions, lastEvaluatedKey] = await TrailModel.queryByRegion(
        regionId,
        lastEvaluatedKey,
      );
      allTrailsByRegion.push(...regions);
    }

    return allTrailsByRegion;
  }

  private static toAttributeMap(Trail: Partial<Trail>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (Trail.id !== undefined) attrMap.id = { S: Trail.id };
    if (Trail.regionId !== undefined) attrMap.regionId = { S: Trail.regionId };
    if (Trail.name !== undefined) attrMap.name = { S: Trail.name };
    if (Trail.closeHashtag !== undefined)
      attrMap.closeHashtag = { S: Trail.closeHashtag };
    if (Trail.updatedAt !== undefined)
      attrMap.updatedAt = { S: Trail.updatedAt };
    if (Trail.createdAt !== undefined)
      attrMap.createdAt = { S: Trail.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<Trail> {
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

  constructor(private attrs: Partial<Trail>) {}

  public async save(updatedAttrs: Partial<Trail> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };

    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.trails.name,
      Item: TrailModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailModel.save failed for Item '${JSON.stringify(
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
    return this.attrs.closeHashtag
      ? ensureHashtagPrefix(this.attrs.closeHashtag)
      : '';
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
