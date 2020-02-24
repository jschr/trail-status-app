import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface TrailAuth {
  trailAuthId: string;
  sessionId: string;
  accessToken: string;
  accessTokenSecret: string;
  updatedAt: string;
}

export default class TrailAuthModel {
  public static async get(trailAuthId: string): Promise<TrailAuthModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trailAuth.name,
        Key: this.toAttributeMap({ trailAuthId })
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailAuthModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailAuthModel.get for trailId '${trailAuthId}' failed with '${err.message}'`
      );
    }
  }

  public static async batchGet(
    items: Array<{
      trailAuthId: string;
    }>
  ): Promise<Array<TrailAuthModel | null>> {
    const requestKeys = items
      .filter(i => i.trailAuthId)
      .map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trailAuth.name]: {
          Keys: requestKeys
        }
      }
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.trailAuth.name];
      if (!tableResults) {
        return [];
      }

      const TrailAuthModels = tableResults.map(
        attrMap => new TrailAuthModel(this.fromAttributeMap(attrMap))
      );

      return items.map(
        item =>
          TrailAuthModels.find(tm => tm.trailAuthId === item.trailAuthId) ||
          null
      );
    } catch (err) {
      throw new Error(
        `TrailAuthModel.batchGet with params '${JSON.stringify(
          params
        )}' failed with '${err.message}'`
      );
    }
  }

  private static toAttributeMap(trailAuth: Partial<TrailAuth>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (trailAuth.trailAuthId !== undefined)
      attrMap.trailAuthId = { S: trailAuth.trailAuthId };
    if (trailAuth.sessionId !== undefined)
      attrMap.sessionId = { S: trailAuth.sessionId };
    if (trailAuth.accessToken !== undefined)
      attrMap.accessToken = { S: trailAuth.accessToken };
    if (trailAuth.accessTokenSecret !== undefined)
      attrMap.accessTokenSecret = { S: trailAuth.accessTokenSecret };
    if (trailAuth.updatedAt !== undefined)
      attrMap.updatedAt = { S: trailAuth.updatedAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap
  ): Partial<TrailAuth> {
    if (!attrMap.trailAuthId || !attrMap.trailAuthId.S)
      throw new Error('Missing trailAuthId parsing attribute map');

    return {
      trailAuthId: attrMap.trailAuthId?.S,
      sessionId: attrMap.sessionId?.S,
      accessToken: attrMap.accessToken?.S,
      accessTokenSecret: attrMap.accessTokenSecret?.S,
      updatedAt: attrMap.updatedAt?.S
    };
  }

  constructor(private attrs: Partial<TrailAuth>) {}

  public async save(updatedAttrs: Partial<TrailAuth> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString()
    };
    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.trailAuth.name,
      Item: TrailAuthModel.toAttributeMap(newAttrs)
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailAuthModel.save failed for Item '${JSON.stringify(
          params.Item
        )}' with '${err.message}'`
      );
    }
  }

  get trailAuthId() {
    return this.attrs.trailAuthId || '';
  }

  get sessionId() {
    return this.attrs.sessionId || '';
  }

  get accessToken() {
    return this.attrs.accessToken || '';
  }

  get accessTokenSecret() {
    return this.attrs.accessTokenSecret || '';
  }

  get updatedAt() {
    return this.attrs.updatedAt || '';
  }

  public toJSON() {
    return {
      trailAuthId: this.trailAuthId,
      sessionId: this.sessionId,
      accessToken: this.accessToken,
      accessTokenSecret: this.accessTokenSecret,
      updatedAt: this.updatedAt
    };
  }
}
