import * as DynamoDB from '@aws-sdk/client-dynamodb';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import { unwrapError } from '../utilities';

export interface TrailStatus {
  id: string;
  status: string;
  updatedAt: string;
  createdAt: string;
}

export default class TrailStatusModel {
  public static async get(id: string): Promise<TrailStatusModel | null> {
    try {
      const params: DynamoDB.GetItemInput = {
        TableName: tables.trailStatus.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params);
      if (!res.Item) return null;

      return new TrailStatusModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailStatusModel.get for id '${id}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<TrailStatusModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trailStatus.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params);
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.trailStatus.name];
      if (!tableResults) {
        return [];
      }

      const TrailStatusModels = tableResults.map(
        attrMap => new TrailStatusModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item => TrailStatusModels.find(tm => tm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `TrailStatusModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  private static toAttributeMap(trailStatus: Partial<TrailStatus>) {
    const attrMap: Record<string, DynamoDB.AttributeValue> = {};

    if (trailStatus.id !== undefined) attrMap.id = { S: trailStatus.id };
    if (trailStatus.status !== undefined)
      attrMap.status = { S: trailStatus.status };
    if (trailStatus.updatedAt !== undefined)
      attrMap.updatedAt = { S: trailStatus.updatedAt };
    if (trailStatus.createdAt !== undefined)
      attrMap.createdAt = { S: trailStatus.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: Record<string, DynamoDB.AttributeValue>,
  ): Partial<TrailStatus> {
    if (!attrMap.id || !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      status: attrMap.status?.S,
      updatedAt: attrMap.updatedAt?.S,
      createdAt: attrMap.createdAt?.S,
    };
  }

  constructor(private attrs: Partial<TrailStatus>) {}

  public async save(updatedAttrs: Partial<TrailStatus> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };
    const params: DynamoDB.PutItemInput = {
      TableName: tables.trailStatus.name,
      Item: TrailStatusModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params);

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailStatusModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${unwrapError(err)}'`,
      );
    }
  }

  public async delete(): Promise<void> {
    const params: DynamoDB.DeleteItemInput = {
      TableName: tables.trailStatus.name,
      Key: TrailStatusModel.toAttributeMap({ id: this.attrs.id }),
    };

    try {
      await dynamodb.deleteItem(params);
    } catch (err) {
      throw new Error(
        `TrailStatusModel.delete failed for id '${
          this.attrs.id
        }' with '${unwrapError(err)}'`,
      );
    }
  }

  get id() {
    return this.attrs.id ?? '';
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
      id: this.id,
      status: this.status,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
    };
  }
}
