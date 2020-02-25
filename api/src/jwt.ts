import { env } from '@trail-status-app/utilities';
import jwt from 'jsonwebtoken';

export enum Permissions {
  UserRead = 'user:read',
  UserUpdate = 'user:update',
  StatusRead = 'status:read'
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

export const createUserSession = (userId: string) => {
  return jwt.sign(
    {
      permissions: [
        Permissions.UserRead,
        Permissions.UserUpdate,
        Permissions.StatusRead
      ]
    },
    jwtSecret,
    {
      audience: apiDomain,
      issuer: apiDomain,
      subject: userId,
      expiresIn: jwtExpiresIn
    }
  );
};
