import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface TrailStatus {
  trailId: string;
  status: string;
  updatedAt: string;
  createdAt: string;
}

export default class TrailStatusModel {
  public static async get(trailId: string): Promise<TrailStatusModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trailStatus.name,
        Key: this.toAttributeMap({ trailId })
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailStatusModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailStatusModel.get for trailId '${trailId}' failed with '${err.message}'`
      );
    }
  }

  public static async batchGet(
    items: Array<{
      trailId: string;
    }>
  ): Promise<Array<TrailStatusModel | null>> {
    const requestKeys = items.filter(i => i.trailId).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trailStatus.name]: {
          Keys: requestKeys
        }
      }
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.trailStatus.name];
      if (!tableResults) {
        return [];
      }

      const TrailStatusModels = tableResults.map(
        attrMap => new TrailStatusModel(this.fromAttributeMap(attrMap))
      );

      return items.map(
        item =>
          TrailStatusModels.find(tm => tm.trailId === item.trailId) ?? null
      );
    } catch (err) {
      throw new Error(
        `TrailStatusModel.batchGet with params '${JSON.stringify(
          params
        )}' failed with '${err.message}'`
      );
    }
  }

  private static toAttributeMap(trailStatus: Partial<TrailStatus>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (trailStatus.trailId !== undefined)
      attrMap.trailId = { S: trailStatus.trailId };
    if (trailStatus.status !== undefined)
      attrMap.status = { S: trailStatus.status };
    if (trailStatus.updatedAt !== undefined)
      attrMap.updatedAt = { S: trailStatus.updatedAt };
    if (trailStatus.createdAt !== undefined)
      attrMap.createdAt = { S: trailStatus.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap
  ): Partial<TrailStatus> {
    if (!attrMap.trailId ?? !attrMap.trailId.S)
      throw new Error('Missing trailId parsing attribute map');

    return {
      trailId: attrMap.trailId?.S,
      status: attrMap.status?.S,
      updatedAt: attrMap.updatedAt?.S,
      createdAt: attrMap.createdAt?.S
    };
  }

  constructor(private attrs: Partial<TrailStatus>) {}

  public async save(updatedAttrs: Partial<TrailStatus> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString()
    };
    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.trailStatus.name,
      Item: TrailStatusModel.toAttributeMap(newAttrs)
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailStatusModel.save failed for Item '${JSON.stringify(
          params.Item
        )}' with '${err.message}'`
      );
    }
  }

  get trailId() {
    return this.attrs.trailId ?? '';
  }

  get status() {
    return this.attrs.status ?? '';
  }

  set status(status: string) {
    this.attrs.status = status;
  }

  get updatedAt() {
    return this.attrs.updatedAt ?? '';
  }

  get createdAt() {
    return this.attrs.createdAt ?? '';
  }

  public toJSON() {
    return {
      status: this.status,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt
    };
  }
}
