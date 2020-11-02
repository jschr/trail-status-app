import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import ensureHashtagPrefix from './ensureHashtagPrefix';

export interface Region {
  id: string;
  userId: string;
  name: string;
  openHashtag: string;
  closeHashtag: string;
  updatedAt: string;
  createdAt: string;
}

export default class RegionModel {
  public static async get(id: string): Promise<RegionModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.regions.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new RegionModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `RegionModel.get for id '${id}' failed with '${err.message}'`,
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

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.regions.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
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
        )}' failed with '${err.message}'`,
      );
    }
  }

  public static async queryByUser(
    userId: string,
    exclusiveStartKey?: AWS.DynamoDB.Key | undefined,
  ): Promise<[RegionModel[], AWS.DynamoDB.Key | undefined]> {
    try {
      const attrMap = this.toAttributeMap({ userId });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.trails.name,
        IndexName: tables.trails.indexes.trailsByRegion.name,
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

      const res = await dynamodb.query(params).promise();

      const trails = res.Items
        ? res.Items.map(item => new RegionModel(this.fromAttributeMap(item)))
        : [];

      return [trails, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(`RegionModel.queryByUser failed with '${err.message}'`);
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
    exclusiveStartKey?: AWS.DynamoDB.Key | undefined,
  ): Promise<[RegionModel[], AWS.DynamoDB.Key | undefined]> {
    const params: AWS.DynamoDB.ScanInput = {
      TableName: tables.regions.name,
      ExclusiveStartKey: exclusiveStartKey,
    };

    try {
      const res = await dynamodb.scan(params).promise();
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
        )}' failed with '${err.message}'`,
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
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (region.id !== undefined) attrMap.id = { S: region.id };
    if (region.userId !== undefined) attrMap.userId = { S: region.userId };
    if (region.name !== undefined) attrMap.name = { S: region.name };
    if (region.openHashtag !== undefined)
      attrMap.openHashtag = { S: region.openHashtag };
    if (region.closeHashtag !== undefined)
      attrMap.closeHashtag = { S: region.closeHashtag };
    if (region.updatedAt !== undefined)
      attrMap.updatedAt = { S: region.updatedAt };
    if (region.createdAt !== undefined)
      attrMap.createdAt = { S: region.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<Region> {
    if (!attrMap.id || !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      userId: attrMap.userId?.S,
      name: attrMap.name?.S,
      openHashtag: attrMap.openHashtag?.S,
      closeHashtag: attrMap.closeHashtag?.S,
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

    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.regions.name,
      Item: RegionModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `RegionModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${err.message}'`,
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
    return this.attrs.userId ?? '';
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
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
    };
  }
}
