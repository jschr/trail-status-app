import * as AWS from 'aws-sdk';
import tables from '@trail-status-app/infrastructure/build/src/tables';
import dynamodb from './dynamodb';

export interface User {
  id: string;
  username: string;
  accessToken: string;
  expiresAt: string;
  lastLoginAt: string;
  createdAt: string;
}

export default class UserModel {
  public static async get(id: string): Promise<UserModel | null> {
    try {
      const params: AWS.DynamoDB.GetItemInput = {
        TableName: tables.users.name,
        Key: this.toAttributeMap({ id }),
      };
      const res = await dynamodb.getItem(params).promise();
      if (!res.Item) return null;

      return new UserModel(this.fromAttributeMap(res.Item));
    } catch (err) {
      throw new Error(
        `UserModel.get for id '${id}' failed with '${err.message}'`,
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
        item => UserModels.find(um => um.id === item.id) ?? null,
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

    if (user.id !== undefined) attrMap.id = { S: user.id };
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
    if (!attrMap.id ?? !attrMap.id.S)
      throw new Error('Missing id parsing attribute map');

    return {
      id: attrMap.id?.S,
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

  get id() {
    return this.attrs.id ?? '';
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
      id: this.id,
      username: this.username,
    };
  }
}
