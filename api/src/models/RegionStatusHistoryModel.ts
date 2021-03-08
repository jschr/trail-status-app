import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface RegionStatusHistory {
  id: string;
  regionId: string;
  instagramPostId: string;
  status: string;
  message: string;
  imageUrl: string;
  instagramPermalink: string;
  createdAt: string;
}

export default class RegionStatusHistoryModel {
  public static async get(
    id: string,
  ): Promise<RegionStatusHistoryModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.regionStatus.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new RegionStatusHistoryModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `RegionStatusHistoryModel.get for id '${id}' failed with '${err.message}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<RegionStatusHistoryModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.regionStatus.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.regionStatus.name];
      if (!tableResults) {
        return [];
      }

      const RegionStatusHistoryModels = tableResults.map(
        attrMap => new RegionStatusHistoryModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item => RegionStatusHistoryModels.find(tm => tm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `RegionStatusHistoryModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${err.message}'`,
      );
    }
  }

  public static async queryByRegion(
    regionId: string,
    exclusiveStartKey?: AWS.DynamoDB.Key | undefined,
  ): Promise<[RegionStatusHistoryModel[], AWS.DynamoDB.Key | undefined]> {
    try {
      const attrMap = this.toAttributeMap({ regionId });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.regionStatusHistory.name,
        IndexName:
          tables.regionStatusHistory.indexes.regionStatusHistoryByRegion.name,
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

      const regionStatuses = res.Items
        ? res.Items.map(
            item => new RegionStatusHistoryModel(this.fromAttributeMap(item)),
          )
        : [];

      return [regionStatuses, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(
        `RegionStatusHistoryModel.queryByRegion failed with '${err.message}'`,
      );
    }
  }

  public static async allByRegion(
    regionId: string,
  ): Promise<RegionStatusHistoryModel[]> {
    const allRegionStatusByRegion: RegionStatusHistoryModel[] = [];

    let [
      regions,
      lastEvaluatedKey,
    ] = await RegionStatusHistoryModel.queryByRegion(regionId);
    allRegionStatusByRegion.push(...regions);

    while (lastEvaluatedKey) {
      [
        regions,
        lastEvaluatedKey,
      ] = await RegionStatusHistoryModel.queryByRegion(
        regionId,
        lastEvaluatedKey,
      );
      allRegionStatusByRegion.push(...regions);
    }

    return allRegionStatusByRegion;
  }

  public static async queryByInstagramPost(
    instagramPostId: string,
    exclusiveStartKey?: AWS.DynamoDB.Key | undefined,
  ): Promise<[RegionStatusHistoryModel[], AWS.DynamoDB.Key | undefined]> {
    try {
      const attrMap = this.toAttributeMap({ instagramPostId });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.regionStatusHistory.name,
        IndexName:
          tables.regionStatusHistory.indexes.regionStatusHistoryByInstagramPost
            .name,
        KeyConditionExpression: '#instagramPostId = :instagramPostId',
        ExpressionAttributeNames: {
          '#instagramPostId': 'instagramPostId',
        },
        ExpressionAttributeValues: {
          ':instagramPostId': attrMap.instagramPostId,
        },
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      };

      const res = await dynamodb.query(params).promise();

      const regionStatuses = res.Items
        ? res.Items.map(
            item => new RegionStatusHistoryModel(this.fromAttributeMap(item)),
          )
        : [];

      return [regionStatuses, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(
        `RegionStatusHistoryModel.queryByInstagramPost failed with '${err.message}'`,
      );
    }
  }

  public static async allByInstagramPost(
    regionId: string,
  ): Promise<RegionStatusHistoryModel[]> {
    const allRegionStatusByInstagramPost: RegionStatusHistoryModel[] = [];

    let [
      regions,
      lastEvaluatedKey,
    ] = await RegionStatusHistoryModel.queryByInstagramPost(regionId);
    allRegionStatusByInstagramPost.push(...regions);

    while (lastEvaluatedKey) {
      [
        regions,
        lastEvaluatedKey,
      ] = await RegionStatusHistoryModel.queryByInstagramPost(
        regionId,
        lastEvaluatedKey,
      );
      allRegionStatusByInstagramPost.push(...regions);
    }

    return allRegionStatusByInstagramPost;
  }

  private static toAttributeMap(regionStatus: Partial<RegionStatusHistory>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (regionStatus.id !== undefined) attrMap.id = { S: regionStatus.id };
    if (regionStatus.regionId !== undefined)
      attrMap.regionId = { S: regionStatus.regionId };
    if (regionStatus.instagramPostId !== undefined)
      attrMap.instagramPostId = { S: regionStatus.instagramPostId };
    if (regionStatus.status !== undefined)
      attrMap.status = { S: regionStatus.status };
    if (regionStatus.message !== undefined)
      attrMap.message = { S: regionStatus.message };
    if (regionStatus.imageUrl !== undefined)
      attrMap.imageUrl = { S: regionStatus.imageUrl };
    if (regionStatus.instagramPermalink !== undefined)
      attrMap.instagramPermalink = { S: regionStatus.instagramPermalink };
    if (regionStatus.createdAt !== undefined)
      attrMap.createdAt = { S: regionStatus.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<RegionStatusHistory> {
    if (!attrMap.id ?? !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      regionId: attrMap.regionId?.S,
      instagramPostId: attrMap.instagramPostId?.S,
      status: attrMap.status?.S,
      message: attrMap.message?.S,
      imageUrl: attrMap.imageUrl?.S,
      instagramPermalink: attrMap.instagramPermalink?.S,
      createdAt: attrMap.createdAt?.S,
    };
  }

  constructor(private attrs: Partial<RegionStatusHistory>) {}

  public async save(
    updatedAttrs: Partial<RegionStatusHistory> = {},
  ): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };
    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.regionStatusHistory.name,
      Item: RegionStatusHistoryModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `RegionStatusHistoryModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${err.message}'`,
      );
    }
  }

  get id() {
    return this.attrs.id ?? '';
  }

  get status() {
    return this.attrs.status ?? '';
  }

  get message() {
    return this.attrs.message ?? '';
  }

  get imageUrl() {
    return this.attrs.imageUrl ?? '';
  }

  get instagramPostId() {
    return this.attrs.instagramPostId ?? '';
  }

  get instagramPermalink() {
    return this.attrs.instagramPermalink ?? '';
  }

  set status(status: string) {
    this.attrs.status = status;
  }

  get createdAt() {
    return this.attrs.createdAt ?? '';
  }

  public toJSON() {
    return {
      id: this.id,
      regionId: this.id,
      instagramPostId: this.instagramPostId,
      status: this.status,
      message: this.message,
      imageUrl: this.imageUrl,
      instagramPermalink: this.instagramPermalink,
      createdAt: this.createdAt,
    };
  }
}
