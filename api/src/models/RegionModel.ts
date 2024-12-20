import * as DynamoDB from '@aws-sdk/client-dynamodb';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import ensureHashtagPrefix from './ensureHashtagPrefix';
import { unwrapError } from '../utilities';

export interface Region {
  id: string;
  userId: string;
  name: string;
  openHashtag: string;
  closeHashtag: string;
  timestreamId?: string;
  updatedAt: string;
  createdAt: string;
}

export default class RegionModel {
  public static async get(id: string): Promise<RegionModel | null> {
    try {
      const params: DynamoDB.GetItemInput = {
        TableName: tables.regions.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params);
      if (!res.Item) return null;

      return new RegionModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `RegionModel.get for id '${id}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<RegionModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.regions.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params);
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.regions.name];
      if (!tableResults) {
        return [];
      }

      const regionModels = tableResults.map(
        attrMap => new RegionModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item => regionModels.find(rm => rm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `RegionModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async queryByUser(
    userId: string,
    exclusiveStartKey?: Record<string, DynamoDB.AttributeValue> | undefined,
  ): Promise<
    [RegionModel[], Record<string, DynamoDB.AttributeValue> | undefined]
  > {
    try {
      const attrMap = this.toAttributeMap({ userId });

      const params: DynamoDB.QueryInput = {
        TableName: tables.regions.name,
        IndexName: tables.regions.indexes.regionsByUser.name,
        KeyConditionExpression: '#userId = :userId',
        ExpressionAttributeNames: {
          '#userId': 'userId',
        },
        ExpressionAttributeValues: {
          ':userId': attrMap.userId,
        },
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      };

      const res = await dynamodb.query(params);

      const trails = res.Items
        ? res.Items.map(item => new RegionModel(this.fromAttributeMap(item)))
        : [];

      return [trails, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(
        `RegionModel.queryByUser failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async allByUser(userId: string): Promise<RegionModel[]> {
    const allRegionsByUser: RegionModel[] = [];

    let [regions, lastEvaluatedKey] = await RegionModel.queryByUser(userId);
    allRegionsByUser.push(...regions);

    while (lastEvaluatedKey) {
      [regions, lastEvaluatedKey] = await RegionModel.queryByUser(
        userId,
        lastEvaluatedKey,
      );
      allRegionsByUser.push(...regions);
    }

    return allRegionsByUser;
  }

  public static async scan(
    exclusiveStartKey?: Record<string, DynamoDB.AttributeValue> | undefined,
  ): Promise<
    [RegionModel[], Record<string, DynamoDB.AttributeValue> | undefined]
  > {
    const params: DynamoDB.ScanInput = {
      TableName: tables.regions.name,
      ExclusiveStartKey: exclusiveStartKey,
    };

    try {
      const res = await dynamodb.scan(params);
      if (!res.Items) {
        return [[], undefined];
      }

      const regions = res.Items.map(
        attrMap => new RegionModel(this.fromAttributeMap(attrMap)),
      );

      return [regions, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(
        `RegionModel.scan with params '${JSON.stringify(
          params,
        )}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async all(): Promise<RegionModel[]> {
    const allRegions: RegionModel[] = [];

    let [regions, lastEvaluatedKey] = await RegionModel.scan();
    allRegions.push(...regions);

    while (lastEvaluatedKey) {
      [regions, lastEvaluatedKey] = await RegionModel.scan(lastEvaluatedKey);
      allRegions.push(...regions);
    }

    return allRegions;
  }

  private static toAttributeMap(region: Partial<Region>) {
    const attrMap: Record<string, DynamoDB.AttributeValue> = {};

    if (region.id !== undefined) attrMap.id = { S: region.id };
    if (region.userId !== undefined) attrMap.userId = { S: region.userId };
    if (region.name !== undefined) attrMap.name = { S: region.name };
    if (region.openHashtag !== undefined)
      attrMap.openHashtag = { S: region.openHashtag };
    if (region.closeHashtag !== undefined)
      attrMap.closeHashtag = { S: region.closeHashtag };
    if (region.timestreamId !== undefined)
      attrMap.timestreamId = { S: region.timestreamId };
    if (region.updatedAt !== undefined)
      attrMap.updatedAt = { S: region.updatedAt };
    if (region.createdAt !== undefined)
      attrMap.createdAt = { S: region.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: Record<string, DynamoDB.AttributeValue>,
  ): Partial<Region> {
    if (!attrMap.id || !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      userId: attrMap.userId?.S,
      name: attrMap.name?.S,
      openHashtag: attrMap.openHashtag?.S,
      closeHashtag: attrMap.closeHashtag?.S,
      timestreamId: attrMap.timestreamId?.S,
      updatedAt: attrMap.updatedAt?.S,
      createdAt: attrMap.createdAt?.S,
    };
  }

  constructor(private attrs: Partial<Region>) {}

  public async save(updatedAttrs: Partial<Region> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };

    const params: DynamoDB.PutItemInput = {
      TableName: tables.regions.name,
      Item: RegionModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params);

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `RegionModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${unwrapError(err)}'`,
      );
    }
  }

  get id() {
    return this.attrs.id ?? '';
  }

  get userId() {
    return this.attrs.userId ?? '';
  }

  get name() {
    return this.attrs.name ?? '';
  }

  get openHashtag() {
    return this.attrs.openHashtag
      ? ensureHashtagPrefix(this.attrs.openHashtag)
      : '';
  }

  get closeHashtag() {
    return this.attrs.closeHashtag
      ? ensureHashtagPrefix(this.attrs.closeHashtag)
      : '';
  }

  get timestreamId() {
    return this.attrs.timestreamId ?? '';
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
      userId: this.userId,
      name: this.name,
      openHashtag: this.openHashtag,
      closeHashtag: this.closeHashtag,
      timestreamId: this.timestreamId,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
    };
  }
}
