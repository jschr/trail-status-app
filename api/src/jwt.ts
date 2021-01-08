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
  WebhookRun = 'webook:run',
  StatusRead = 'status:read',
  StatusUpdate = 'status:update',
  GCMWebhookRun = 'gcm-webhook:run',
}

export interface DecodedToken {
  username: string;
  profilePictureUrl: string | null;
  permissions: string[];
  regions: Array<{ id: string; name: string }>;
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

export const createUserSession = (
  userId: string,
  username: string,
  regions: Array<{ id: string; name: string }>,
) => {
  return jwt.sign(
    {
      username,
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
      })),
      permissions: [
        Permissions.RegionRead,
        Permissions.RegionUpdate,
        Permissions.TrailRead,
        Permissions.TrailUpdate,
        Permissions.TrailCreate,
        Permissions.WebhookRead,
        Permissions.WebhookUpdate,
        Permissions.WebhookCreate,
        Permissions.WebhookRun,
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

export const createGCMWebhookToken = (userId: string, topic: string) => {
  return jwt.sign(
    {
      topic,
      permissions: [Permissions.WebhookRun],
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

export const canAccessRegion = (
  decodedToken: DecodedToken,
  regionId: string,
) => {
  return !!decodedToken.regions.find(r => r.id === regionId);
};
