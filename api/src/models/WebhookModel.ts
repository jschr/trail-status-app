import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface Webhook {
  webhookId: string;
  trailId: string;
  runPriority: number;
  name: string;
  url: string;
  lastRanAt: string;
  error: string;
}

export default class WebhookModel {
  public static async get(webhookId: string): Promise<WebhookModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.webhooks.name,
        Key: this.toAttributeMap({ webhookId }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new WebhookModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `WebhookModel.get for webhookId '${webhookId}' failed with '${err.message}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      webhookId: string;
    }>,
  ): Promise<Array<WebhookModel | null>> {
    const requestKeys = items.filter(i => i.webhookId).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.webhooks.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.webhooks.name];
      if (!tableResults) {
        return [];
      }

      const WebhookModels = tableResults.map(
        attrMap => new WebhookModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item =>
          WebhookModels.find(wm => wm.webhookId === item.webhookId) ?? null,
      );
    } catch (err) {
      throw new Error(
        `WebhookModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${err.message}'`,
      );
    }
  }

  public static async getTrailWebhooks(trailId: string) {
    try {
      const attrMap = this.toAttributeMap({ trailId });

      const params: AWS.DynamoDB.QueryInput = {
        TableName: tables.webhooks.name,
        IndexName: tables.webhooks.indexes.trailWebhooks.name,
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
        ? res.Items.map(item => new WebhookModel(this.fromAttributeMap(item)))
        : [];
    } catch (err) {
      throw new Error(
        `WebhookModel.getTrailWebhooks failed with '${err.message}'`,
      );
    }
  }

  private static toAttributeMap(webhook: Partial<Webhook>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (webhook.webhookId !== undefined) {
      attrMap.webhookId = { S: webhook.webhookId };
    }
    if (webhook.trailId !== undefined) {
      attrMap.trailId = { S: webhook.trailId };
    }
    if (webhook.runPriority !== undefined) {
      attrMap.runPriority = { N: String(webhook.runPriority) };
    }
    if (webhook.name !== undefined) {
      attrMap.name = { S: webhook.name };
    }
    if (webhook.url !== undefined) {
      attrMap.url = { S: webhook.url };
    }
    if (webhook.lastRanAt !== undefined) {
      attrMap.lastRanAt = { S: webhook.lastRanAt };
    }
    if (webhook.error !== undefined) {
      attrMap.error = { S: webhook.error };
    }

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<Webhook> {
    if (!attrMap.webhookId || !attrMap.trailId.S)
      throw new Error('Missing webhookId parsing attribute map');

    return {
      webhookId: attrMap.webhookId?.S,
      trailId: attrMap.trailId?.S,
      runPriority: Number(attrMap.runPriority?.N),
      url: attrMap.url?.S,
      name: attrMap.name?.S,
      lastRanAt: attrMap.lastRanAt?.S,
      error: attrMap.error?.S,
    };
  }

  constructor(private attrs: Partial<Webhook>) {}

  public async save(updatedAttrs: Partial<Webhook> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };

    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.webhooks.name,
      Item: WebhookModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `WebhookModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${err.message}'`,
      );
    }
  }

  get webhookId() {
    return this.attrs.webhookId ?? '';
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
      webhookId: this.webhookId,
      trailId: this.trailId,
      runPriority: this.runPriority,
      name: this.name,
      url: this.url,
      lastRanAt: this.lastRanAt,
      error: this.error,
    };
  }
}
