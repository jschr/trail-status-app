import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface TrailAuthSession {
  sessionId: string;
  trailId: string;
  updatedAt: string;
}

export default class TrailAuthSessionModel {
  public static async get(
    sessionId: string
  ): Promise<TrailAuthSessionModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trailAuthSession.name,
        Key: this.toAttributeMap({ sessionId })
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailAuthSessionModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailAuthSessionModel.get for trailId '${sessionId}' failed with '${err.message}'`
      );
    }
  }

  public static async batchGet(
    items: Array<{
      sessionId: string;
    }>
  ): Promise<Array<TrailAuthSessionModel | null>> {
    const requestKeys = items.filter(i => i.sessionId).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trailAuthSession.name]: {
          Keys: requestKeys
        }
      }
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.trailAuthSession.name];
      if (!tableResults) {
        return [];
      }

      const TrailAuthSessionModels = tableResults.map(
        attrMap => new TrailAuthSessionModel(this.fromAttributeMap(attrMap))
      );

      return items.map(
        item =>
          TrailAuthSessionModels.find(tm => tm.sessionId === item.sessionId) ||
          null
      );
    } catch (err) {
      throw new Error(
        `TrailAuthSessionModel.batchGet with params '${JSON.stringify(
          params
        )}' failed with '${err.message}'`
      );
    }
  }

  private static toAttributeMap(trailAuth: Partial<TrailAuthSession>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (trailAuth.sessionId !== undefined)
      attrMap.sessionId = { S: trailAuth.sessionId };
    if (trailAuth.trailId !== undefined)
      attrMap.trailId = { S: trailAuth.trailId };
    if (trailAuth.updatedAt !== undefined)
      attrMap.updatedAt = { S: trailAuth.updatedAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap
  ): Partial<TrailAuthSession> {
    if (!attrMap.sessionId || !attrMap.sessionId.S)
      throw new Error('Missing sessionId parsing attribute map');

    return {
      sessionId: attrMap.sessionId && attrMap.sessionId.S,
      trailId: attrMap.trailId.S,
      updatedAt: attrMap.updatedAt && attrMap.updatedAt.S
    };
  }

  constructor(private attrs: Partial<TrailAuthSession>) {}

  public async save(
    updatedAttrs: Partial<TrailAuthSession> = {}
  ): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString()
    };
    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.trailAuthSession.name,
      Item: TrailAuthSessionModel.toAttributeMap(newAttrs)
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailAuthSessionModel.save failed for Item '${JSON.stringify(
          params.Item
        )}' with '${err.message}'`
      );
    }
  }

  get sessionId() {
    return this.attrs.sessionId || '';
  }

  get trailId() {
    return this.attrs.trailId || '';
  }

  get updatedAt() {
    return this.attrs.updatedAt || '';
  }

  public toJSON() {
    return {
      sessionId: this.sessionId,
      trailId: this.trailId,
      updatedAt: this.updatedAt
    };
  }
}
