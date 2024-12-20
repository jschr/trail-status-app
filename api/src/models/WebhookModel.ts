import * as DynamoDB from '@aws-sdk/client-dynamodb';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import { unwrapError } from '../utilities';

export interface Webhook {
  id: string;
  regionId: string;
  trailId?: string;
  runPriority: number;
  name: string;
  description?: string;
  method: string;
  url: string;
  enabled: boolean;
  lastRanAt: string;
  error: string;
  updatedAt: string;
  createdAt: string;
}

export default class WebhookModel {
  public static async get(id: string): Promise<WebhookModel | null> {
    try {
      const params: DynamoDB.GetItemInput = {
        TableName: tables.webhooks.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params);
      if (!res.Item) return null;

      return new WebhookModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `WebhookModel.get for id '${id}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<WebhookModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.webhooks.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params);
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
        item => WebhookModels.find(wm => wm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `WebhookModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async queryByRegion(
    regionId: string,
    exclusiveStartKey?: Record<string, DynamoDB.AttributeValue> | undefined,
  ): Promise<
    [WebhookModel[], Record<string, DynamoDB.AttributeValue> | undefined]
  > {
    try {
      const attrMap = this.toAttributeMap({ regionId });

      const params: DynamoDB.QueryInput = {
        TableName: tables.webhooks.name,
        IndexName: tables.webhooks.indexes.webhooksByRegion.name,
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

      const res = await dynamodb.query(params);

      const trails = res.Items
        ? res.Items.map(item => new WebhookModel(this.fromAttributeMap(item)))
        : [];

      return [trails, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(
        `WebhookModel.queryByRegion failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async allByRegion(regionId: string): Promise<WebhookModel[]> {
    const allWebhooksByRegion: WebhookModel[] = [];

    let [regions, lastEvaluatedKey] = await WebhookModel.queryByRegion(
      regionId,
    );
    allWebhooksByRegion.push(...regions);

    while (lastEvaluatedKey) {
      [regions, lastEvaluatedKey] = await WebhookModel.queryByRegion(
        regionId,
        lastEvaluatedKey,
      );
      allWebhooksByRegion.push(...regions);
    }

    return allWebhooksByRegion;
  }

  private static toAttributeMap(webhook: Partial<Webhook>) {
    const attrMap: Record<string, DynamoDB.AttributeValue> = {};

    if (webhook.id !== undefined) {
      attrMap.id = { S: webhook.id };
    }
    if (webhook.regionId !== undefined) {
      attrMap.regionId = { S: webhook.regionId };
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
    if (webhook.description !== undefined) {
      attrMap.description = { S: webhook.description };
    }
    if (webhook.method !== undefined) {
      attrMap.method = { S: webhook.method };
    }
    if (webhook.url !== undefined) {
      attrMap.url = { S: webhook.url };
    }
    if (webhook.enabled !== undefined) {
      attrMap.enabled = { BOOL: webhook.enabled };
    }
    if (webhook.lastRanAt !== undefined) {
      attrMap.lastRanAt = { S: webhook.lastRanAt };
    }
    if (webhook.error !== undefined) {
      attrMap.error = { S: webhook.error };
    }
    if (webhook.updatedAt !== undefined) {
      attrMap.updatedAt = { S: webhook.updatedAt };
    }
    if (webhook.createdAt !== undefined) {
      attrMap.createdAt = { S: webhook.createdAt };
    }

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: Record<string, DynamoDB.AttributeValue>,
  ): Partial<Webhook> {
    if (!attrMap.id || !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      regionId: attrMap.regionId?.S,
      trailId: attrMap.trailId?.S,
      runPriority: Number(attrMap.runPriority?.N),
      method: attrMap.method?.S,
      url: attrMap.url?.S,
      enabled: attrMap.enabled?.BOOL,
      name: attrMap.name?.S,
      description: attrMap.description?.S,
      lastRanAt: attrMap.lastRanAt?.S,
      error: attrMap.error?.S,
      updatedAt: attrMap.createdAt?.S,
      createdAt: attrMap.createdAt?.S,
    };
  }

  constructor(private attrs: Partial<Webhook>) {}

  public async save(updatedAttrs: Partial<Webhook> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };

    const params: DynamoDB.PutItemInput = {
      TableName: tables.webhooks.name,
      Item: WebhookModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params);

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `WebhookModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${unwrapError(err)}'`,
      );
    }
  }

  public async delete(): Promise<void> {
    const params: DynamoDB.DeleteItemInput = {
      TableName: tables.webhooks.name,
      Key: WebhookModel.toAttributeMap({ id: this.attrs.id }),
    };

    try {
      await dynamodb.deleteItem(params);
    } catch (err) {
      throw new Error(
        `WebhookModel.delete failed for id '${
          this.attrs.id
        }' with '${unwrapError(err)}'`,
      );
    }
  }

  get id() {
    return this.attrs.id ?? '';
  }

  get regionId() {
    return this.attrs.regionId ?? '';
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

  get description() {
    return this.attrs.description ?? '';
  }

  get method() {
    return this.attrs.method ?? '';
  }

  get url() {
    return this.attrs.url ?? '';
  }

  get enabled() {
    return this.attrs.enabled ?? false;
  }

  get lastRanAt() {
    return this.attrs.lastRanAt ?? '';
  }

  get error() {
    return this.attrs.error ?? '';
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
      trailId: this.trailId,
      runPriority: this.runPriority,
      name: this.name,
      description: this.description,
      url: this.url,
      method: this.method,
      enabled: this.enabled,
      lastRanAt: this.lastRanAt,
      error: this.error,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
    };
  }
}
