import * as admin from 'firebase-admin';
import { assert, env } from '@trail-status-app/utilities';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError } from '../HttpError';
import { parseQuery, parseBody } from '../requests';
import { Permissions as P } from '../jwt';

interface GCMWebhookQuery {
  topic: string;
}

interface GCMWebhookBody {
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

// TODO: Add a was to set Authorization header for webhooks.

// Generate a token for env:
// yarn dotenv -e .env -e .env.local ts-node
// const jwt = require('./api/src/jwt');
// jwt.createGCMWebhookToken('instagram|17841430372261684', 'hydrocut_status')

// export default withApiHandler([P.GCMWebhookRun], async event => {
export default withApiHandler([], async event => {
  console.info(
    'event.queryStringParameters',
    JSON.stringify(event.queryStringParameters),
  );
  console.info('event.body', event.body);

  const { topic } = assertGCMWebhookQuery(parseQuery(event));
  const { status, message, imageUrl } = assertGCMWebhookBody(parseBody(event));

  try {
    await admin.messaging().send({
      notification: {
        title: status === 'open' ? 'Trails are open' : 'Trails are closed',
        body: message,
        imageUrl,
      },
      topic,
    });

    return json('OK');
  } catch (err) {
    throw new BadRequestError(
      `Failed to send message to GCM with '${err.message}'`,
    );
  }
});

const assertGCMWebhookQuery = (query: any): GCMWebhookQuery => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.topic !== 'string',
    new BadRequestError('Missing topic query parameter.'),
  );

  return query;
};

const assertGCMWebhookBody = (body: any): GCMWebhookBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
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
