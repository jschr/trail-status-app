import jwt from 'jsonwebtoken';
import { env } from '@trail-status-app/utilities';
import { Permissions } from '../api/src/jwt';

const jwtSecret = env('JWT_SECRET');

let apiDomain = env('TLD');
if (env('API_PORT', false)) {
  apiDomain = `${apiDomain}:${env('API_PORT', false)}`;
}
if (env('API_SUBDOMAIN', false)) {
  apiDomain = `${env('API_SUBDOMAIN', false)}.${apiDomain}`;
}

const regions: Array<{ id: string; name: string }> = [
  // TODO: Add regions here
];

async function createJWT() {
  const token = jwt.sign(
    {
      // userId,
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
      })),
      permissions: [
        // Permissions.RegionRead,
        Permissions.RegionUpdate,
        // Permissions.TrailRead,
        // Permissions.TrailUpdate,
        // Permissions.TrailCreate,
        // Permissions.WebhookRead,
        // Permissions.WebhookUpdate,
        // Permissions.WebhookCreate,
        // Permissions.WebhookRun,
      ],
    },
    jwtSecret,
    {
      audience: apiDomain,
      issuer: apiDomain,
      // subject: userId,
    },
  );

  console.log(token);
}

createJWT().catch(console.error);
