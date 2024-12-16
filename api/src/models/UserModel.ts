import * as DynamoDB from '@aws-sdk/client-dynamodb';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';
import { unwrapError } from '../utilities';

export interface User {
  id: string;
  username: string;
  profilePictureUrl: string;
  accessToken: string;
  expiresAt: string;
  lastLoginAt: string;
  createdAt: string;
  sharedRegions: string[];
}

const isNotNullOrUndefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

export default class UserModel {
  public static async get(id: string): Promise<UserModel | null> {
    try {
      const params: DynamoDB.GetItemInput = {
        TableName: tables.users.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params);
      if (!res.Item) return null;

      return new UserModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `UserModel.get for id '${id}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      id: string;
    }>,
  ): Promise<Array<UserModel | null>> {
    const requestKeys = items.filter(i => i.id).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.users.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params);
      if (!res.Responses) {
        return [];
      }

      const tableResults = res.Responses[tables.users.name];
      if (!tableResults) {
        return [];
      }

      const UserModels = tableResults.map(
        attrMap => new UserModel(this.fromAttributeMap(attrMap)),
      );

      return items.map(
        item => UserModels.find(um => um.id === item.id) ?? null,
      );
    } catch (err) {
      throw new Error(
        `UserModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async scan(
    exclusiveStartKey?: Record<string, DynamoDB.AttributeValue> | undefined,
  ): Promise<
    [UserModel[], Record<string, DynamoDB.AttributeValue> | undefined]
  > {
    const params: DynamoDB.ScanInput = {
      TableName: tables.users.name,
      ExclusiveStartKey: exclusiveStartKey,
    };

    try {
      const res = await dynamodb.scan(params);
      if (!res.Items) {
        return [[], undefined];
      }

      const users = res.Items.map(
        attrMap => new UserModel(this.fromAttributeMap(attrMap)),
      );

      return [users, res.LastEvaluatedKey];
    } catch (err) {
      throw new Error(
        `UserModel.scan with params '${JSON.stringify(
          params,
        )}' failed with '${unwrapError(err)}'`,
      );
    }
  }

  public static async all(): Promise<UserModel[]> {
    const allUsers: UserModel[] = [];

    let [useres, lastEvaluatedKey] = await UserModel.scan();
    allUsers.push(...useres);

    while (lastEvaluatedKey) {
      [useres, lastEvaluatedKey] = await UserModel.scan(lastEvaluatedKey);
      allUsers.push(...useres);
    }

    return allUsers;
  }

  private static toAttributeMap(user: Partial<User>) {
    const attrMap: Record<string, DynamoDB.AttributeValue> = {};

    if (user.id !== undefined) attrMap.id = { S: user.id };
    if (user.username !== undefined) attrMap.username = { S: user.username };
    if (user.profilePictureUrl !== undefined)
      attrMap.profilePictureUrl = { S: user.profilePictureUrl };
    if (user.accessToken !== undefined)
      attrMap.accessToken = { S: user.accessToken };
    if (user.expiresAt !== undefined) attrMap.expiresAt = { S: user.expiresAt };
    if (user.lastLoginAt !== undefined)
      attrMap.lastLoginAt = { S: user.lastLoginAt };
    if (user.createdAt !== undefined) attrMap.createdAt = { S: user.createdAt };
    if (user.sharedRegions !== undefined) {
      attrMap.sharedRegions = attrMap.sharedRegions = {
        L: user.sharedRegions.map(regionId => ({ S: regionId })),
      };
    }

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: Record<string, DynamoDB.AttributeValue>,
  ): Partial<User> {
    if (!attrMap.id || !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
      username: attrMap.username?.S,
      profilePictureUrl: attrMap.profilePictureUrl?.S,
      accessToken: attrMap.accessToken?.S,
      expiresAt: attrMap.expiresAt?.S,
      lastLoginAt: attrMap.lastLoginAt?.S,
      createdAt: attrMap.createdAt?.S,
      sharedRegions: attrMap.sharedRegions?.L?.map(i => i.S).filter(
        isNotNullOrUndefined,
      ),
    };
  }

  constructor(private attrs: Partial<User>) {}

  public async save(updatedAttrs: Partial<User> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };
    const params: DynamoDB.PutItemInput = {
      TableName: tables.users.name,
      Item: UserModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params);

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `UserModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${unwrapError(err)}'`,
      );
    }
  }

  get id() {
    return this.attrs.id ?? '';
  }

  get username() {
    return this.attrs.username ?? '';
  }

  get profilePictureUrl() {
    return this.attrs.profilePictureUrl ?? '';
  }

  get accessToken() {
    return this.attrs.accessToken ?? '';
  }

  get expiresAt() {
    return this.attrs.expiresAt ?? '';
  }

  get lastLoginAt() {
    return this.attrs.lastLoginAt ?? '';
  }

  get createdAt() {
    return this.attrs.createdAt ?? '';
  }

  get sharedRegions() {
    return this.attrs.sharedRegions ?? [];
  }

  public toJSON() {
    return {
      id: this.id,
      username: this.username,
      profilePictureUrl: this.profilePictureUrl,
      createdAt: this.createdAt,
      sharedRegions: this.sharedRegions,
    };
  }
}
