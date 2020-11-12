import { env } from '@trail-status-app/utilities';
import jwt from 'jsonwebtoken';

export enum Permissions {
  RegionRead = 'region:read',
  RegionUpdate = 'region:update',
  TrailRead = 'trail:read',
  TrailUpdate = 'trail:update',
  TrailCreate = 'trail:create',
  WebhookRead = 'webook:read',
  WebhookCreate = 'webook:create',
  WebhookUpdate = 'webook:update',
  StatusRead = 'status:read',
  StatusUpdate = 'status:update',
}

export interface DecodedToken {
  username: string;
  profilePictureUrl: string | null;
  permissions: string[];
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  sub: string;
}

const jwtSecret = env('JWT_SECRET');
const jwtExpiresIn = env('JWT_EXPIRES_IN');

let apiDomain = env('TLD');
if (env('API_PORT', false)) {
  apiDomain = `${apiDomain}:${env('API_PORT', false)}`;
}
if (env('API_SUBDOMAIN', false)) {
  apiDomain = `${env('API_SUBDOMAIN', false)}.${apiDomain}`;
}

export const createUserSession = (userId: string, username: string) => {
  return jwt.sign(
    {
      username,
      permissions: [
        Permissions.RegionRead,
        Permissions.RegionUpdate,
        Permissions.TrailRead,
        Permissions.TrailUpdate,
        Permissions.TrailCreate,
        Permissions.WebhookRead,
        Permissions.WebhookUpdate,
        Permissions.WebhookCreate,
        Permissions.StatusRead,
      ],
    },
    jwtSecret,
    {
      audience: apiDomain,
      issuer: apiDomain,
      subject: userId,
      expiresIn: jwtExpiresIn,
    },
  );
};

export const verify = (token: string): DecodedToken => {
  const decodedToken = jwt.verify(token, jwtSecret, {
    audience: apiDomain,
  }) as any;

  if (!decodedToken || typeof decodedToken !== 'object') {
    throw new Error('Invalid token');
  }

  if (!Array.isArray(decodedToken.permissions)) {
    throw new Error('Invalid permissions');
  }
  return decodedToken;
};
