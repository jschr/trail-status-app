import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface TrailWebhook {
  id: string;
  trailId: string;
  runPriority: number;
  name: string;
  url: string;
  lastRanAt: string;
  error: string;
}

export default class TrailWebhookModel {
  public static async get(id: string): Promise<TrailWebhookModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.trailWebhooks.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new TrailWebhookModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `TrailWebhookModel.get for id '${id}' failed with '${err.message}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<TrailWebhookModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.trailWebhooks.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.trailWebhooks.name];
      if (!tableResults) {
        return [];
      }

      const WebhookModels = tableResults.map(
        attrMap => new TrailWebhookModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item => WebhookModels.find(wm => wm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `TrailWebhookModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${err.message}'`,
      );
    }
  }

  public static async getWebhooksByTrail(trailId: string) {
    try {
      const attrMap = this.toAttributeMap({ trailId });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.trailWebhooks.name,
        IndexName: tables.trailWebhooks.indexes.webhooksByRegion.name,
        KeyConditionExpression: '#trailId = :trailId',
        ExpressionAttributeNames: {
          '#trailId': 'trailId',
        },
        ExpressionAttributeValues: {
          ':trailId': attrMap.trailId,
        },
        ScanIndexForward: true,
        Limit: 100,
      };

      const res = await dynamodb.query(params).promise();

      return res.Items
        ? res.Items.map(
            item => new TrailWebhookModel(this.fromAttributeMap(item)),
          )
        : [];
    } catch (err) {
      throw new Error(
        `TrailWebhookModel.getWebhooksByTrail failed with '${err.message}'`,
      );
    }
  }

  private static toAttributeMap(trailWebhook: Partial<TrailWebhook>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (trailWebhook.id !== undefined) {
      attrMap.id = { S: trailWebhook.id };
    }
    if (trailWebhook.trailId !== undefined) {
      attrMap.trailId = { S: trailWebhook.trailId };
    }
    if (trailWebhook.runPriority !== undefined) {
      attrMap.runPriority = { N: String(trailWebhook.runPriority) };
    }
    if (trailWebhook.name !== undefined) {
      attrMap.name = { S: trailWebhook.name };
    }
    if (trailWebhook.url !== undefined) {
      attrMap.url = { S: trailWebhook.url };
    }
    if (trailWebhook.lastRanAt !== undefined) {
      attrMap.lastRanAt = { S: trailWebhook.lastRanAt };
    }
    if (trailWebhook.error !== undefined) {
      attrMap.error = { S: trailWebhook.error };
    }

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<TrailWebhook> {
    if (!attrMap.id || !attrMap.trailId.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      trailId: attrMap.trailId?.S,
      runPriority: Number(attrMap.runPriority?.N),
      url: attrMap.url?.S,
      name: attrMap.name?.S,
      lastRanAt: attrMap.lastRanAt?.S,
      error: attrMap.error?.S,
    };
  }

  constructor(private attrs: Partial<TrailWebhook>) {}

  public async save(updatedAttrs: Partial<TrailWebhook> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };

    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.trailWebhooks.name,
      Item: TrailWebhookModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `TrailWebhookModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${err.message}'`,
      );
    }
  }

  get id() {
    return this.attrs.id ?? '';
  }

  get trailId() {
    return this.attrs.trailId ?? '';
  }

  get runPriority() {
    return this.attrs.runPriority ?? 0;
  }

  get name() {
    return this.attrs.name ?? '';
  }

  get url() {
    return this.attrs.url ?? '';
  }

  get lastRanAt() {
    return this.attrs.lastRanAt ?? '';
  }

  get error() {
    return this.attrs.error ?? '';
  }

  public toJSON() {
    return {
      id: this.id,
      trailId: this.trailId,
      runPriority: this.runPriority,
      name: this.name,
      url: this.url,
      lastRanAt: this.lastRanAt,
      error: this.error,
    };
  }
}
