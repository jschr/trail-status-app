import * as admin from 'firebase-admin';
import { assert, env } from '@trail-status-app/utilities';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, UnauthorizedError } from '../HttpError';
import { parseBody } from '../requests';
import { Permissions as P, canAccessRegion } from '../jwt';

interface GCMWebhookBody {
  id: string;
  status: 'open' | 'closed';
  message: string;
  imageUrl: string;
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env('FIREBASE_PROJECT_ID'),
    clientEmail: env('FIREBASE_CLIENT_EMAIL'),
    privateKey: env('FIREBASE_PRIVATE_KEY'),
  }),
});

export default withApiHandler([P.GCMWebhookRun], async event => {
  console.info('event.queryStringParameters', event.queryStringParameters);
  console.info('event.body', event.body);

  const { id: regionId, status, message, imageUrl } = assertGCMWebhookBody(
    parseBody(event),
  );

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, regionId)) {
    throw new UnauthorizedError(
      `User does not have access to region '${regionId}'`,
    );
  }

  try {
    await admin.messaging().send({
      topic: `${regionId}_status`,
      notification: {
        title: status === 'open' ? 'Trails are open' : 'Trails are closed',
        body: message,
        imageUrl,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
      android: {
        notification: {
          sound: 'default',
        },
      },
    });

    return json('OK');
  } catch (err) {
    throw new BadRequestError(
      `Failed to send message to GCM with '${err.message}'`,
    );
  }
});

const assertGCMWebhookBody = (body: any): GCMWebhookBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.id !== 'string',
    new BadRequestError(`Invalid id provided in body.`),
  );

  assert(
    typeof body.status !== 'string' &&
      !['open', 'closed'].includes(body.status),
    new BadRequestError(`Invalid status '${body.status}' provided in body.`),
  );

  assert(
    typeof body.message !== 'string',
    new BadRequestError(`Invalid message provided in body.`),
  );

  assert(
    typeof body.imageUrl !== 'string',
    new BadRequestError(`Invalid imageUrl provided in body.`),
  );

  return body;
};
