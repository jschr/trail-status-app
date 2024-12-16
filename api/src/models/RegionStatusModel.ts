import * as DynamoDB from '@aws-sdk/client-dynamodb';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import { unwrapError } from '../utilities';

export interface RegionStatus {
  id: string;
  status: string;
  message: string;
  imageUrl: string;
  instagramPostId: string;
  instagramPermalink: string;
  updatedAt: string;
  createdAt: string;
}

export default class RegionStatusModel {
  public static async get(id: string): Promise<RegionStatusModel | null> {
    try {
      const params: DynamoDB.GetItemInput = {
        TableName: tables.regionStatus.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params);
      if (!res.Item) return null;

      return new RegionStatusModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `RegionStatusModel.get for id '${id}' failed with '${unwrapError(
          err,
        )}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<RegionStatusModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.regionStatus.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params);
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.regionStatus.name];
      if (!tableResults) {
        return [];
      }

      const RegionStatusModels = tableResults.map(
        attrMap => new RegionStatusModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item => RegionStatusModels.find(tm => tm.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `RegionStatusModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  private static toAttributeMap(regionStatus: Partial<RegionStatus>) {
    const attrMap: Record<string, DynamoDB.AttributeValue> = {};

    if (regionStatus.id !== undefined) attrMap.id = { S: regionStatus.id };
    if (regionStatus.status !== undefined)
      attrMap.status = { S: regionStatus.status };
    if (regionStatus.message !== undefined)
      attrMap.message = { S: regionStatus.message };
    if (regionStatus.imageUrl !== undefined)
      attrMap.imageUrl = { S: regionStatus.imageUrl };
    if (regionStatus.instagramPostId !== undefined)
      attrMap.instagramPostId = { S: regionStatus.instagramPostId };
    if (regionStatus.instagramPermalink !== undefined)
      attrMap.instagramPermalink = { S: regionStatus.instagramPermalink };
    if (regionStatus.updatedAt !== undefined)
      attrMap.updatedAt = { S: regionStatus.updatedAt };
    if (regionStatus.createdAt !== undefined)
      attrMap.createdAt = { S: regionStatus.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: Record<string, DynamoDB.AttributeValue>,
  ): Partial<RegionStatus> {
    if (!attrMap.id || !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      status: attrMap.status?.S,
      message: attrMap.message?.S,
      imageUrl: attrMap.imageUrl?.S,
      instagramPostId: attrMap.instagramPostId?.S,
      instagramPermalink: attrMap.instagramPermalink?.S,
      updatedAt: attrMap.updatedAt?.S,
      createdAt: attrMap.createdAt?.S,
    };
  }

  constructor(private attrs: Partial<RegionStatus>) {}

  public async save(updatedAttrs: Partial<RegionStatus> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };
    const params: DynamoDB.PutItemInput = {
      TableName: tables.regionStatus.name,
      Item: RegionStatusModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params);

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `RegionStatusModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${unwrapError(err)}'`,
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
      message: this.message,
      imageUrl: this.imageUrl,
      instagramPostId: this.instagramPostId,
      instagramPermalink: this.instagramPermalink,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
    };
  }
}
