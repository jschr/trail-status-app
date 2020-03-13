import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface User {
  userId: string;
  username: string;
  accessToken: string;
  expiresAt: string;
  lastLoginAt: string;
  createdAt: string;
}

export default class UserModel {
  public static async get(userId: string): Promise<UserModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.users.name,
        Key: this.toAttributeMap({ userId }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new UserModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `UserModel.get for userId '${userId}' failed with '${err.message}'`,
      );
    }
  }

  public static async batchGet(
    items: Array<{
      userId: string;
    }>,
  ): Promise<Array<UserModel | null>> {
    const requestKeys = items.filter(i => i.userId).map(this.toAttributeMap);
    if (requestKeys.length === 0) return [];

    const params: AWS.DynamoDB.BatchGetItemInput = {
      RequestItems: {
        [tables.users.name]: {
          Keys: requestKeys,
        },
      },
    };

    try {
      const res = await dynamodb.batchGetItem(params).promise();
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
        item => UserModels.find(um => um.userId === item.userId) ?? null,
      );
    } catch (err) {
      throw new Error(
        `UserModel.batchGet with params '${JSON.stringify(
          params,
        )}' failed with '${err.message}'`,
      );
    }
  }

  private static toAttributeMap(user: Partial<User>) {
    const attrMap: AWS.DynamoDB.AttributeMap = {};

    if (user.userId !== undefined) attrMap.userId = { S: user.userId };
    if (user.username !== undefined) attrMap.username = { S: user.username };
    if (user.accessToken !== undefined)
      attrMap.accessToken = { S: user.accessToken };
    if (user.expiresAt !== undefined) attrMap.expiresAt = { S: user.expiresAt };
    if (user.lastLoginAt !== undefined)
      attrMap.lastLoginAt = { S: user.lastLoginAt };
    if (user.createdAt !== undefined) attrMap.createdAt = { S: user.createdAt };

    return attrMap;
  }

  private static fromAttributeMap(
    attrMap: AWS.DynamoDB.AttributeMap,
  ): Partial<User> {
    if (!attrMap.userId ?? !attrMap.userId.S)
      throw new Error('Missing userId parsing attribute map');

    return {
      userId: attrMap.userId?.S,
      username: attrMap.username?.S,
      accessToken: attrMap.accessToken?.S,
      expiresAt: attrMap.expiresAt?.S,
      lastLoginAt: attrMap.lastLoginAt?.S,
      createdAt: attrMap.createdAt?.S,
    };
  }

  constructor(private attrs: Partial<User>) {}

  public async save(updatedAttrs: Partial<User> = {}): Promise<void> {
    const newAttrs = {
      ...this.attrs,
      ...updatedAttrs,
      updatedAt: new Date().toISOString(),
    };
    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tables.users.name,
      Item: UserModel.toAttributeMap(newAttrs),
    };

    try {
      await dynamodb.putItem(params).promise();

      this.attrs = newAttrs;
    } catch (err) {
      throw new Error(
        `UserModel.save failed for Item '${JSON.stringify(
          params.Item,
        )}' with '${err.message}'`,
      );
    }
  }

  get userId() {
    return this.attrs.userId ?? '';
  }

  get username() {
    return this.attrs.username ?? '';
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

  public toJSON() {
    return {
      userId: this.userId,
      username: this.username,
    };
  }
}
