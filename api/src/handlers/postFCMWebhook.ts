import { assert } from '@trail-status-app/utilities';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, UnauthorizedError } from '../HttpError';
import firebase from '../clients/firebase';
import { parseBody, parseQuery } from '../requests';
import { Permissions as P, canAccessRegion } from '../jwt';
import { unwrapError } from '../utilities';

interface PostFCMWebhookQuery {
  link: string;
}

interface PostFCMWebhookBody {
  id: string;
  status: 'open' | 'closed';
  message: string;
  imageUrl: string;
}

export default withApiHandler([P.FCMWebhookRun], async event => {
  const { id: regionId, status, message, imageUrl } = assertPostFCMWebhookBody(
    parseBody(event),
  );

  const { link } = assertPostFCMWebhookQuery(parseQuery(event));

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, regionId)) {
    throw new UnauthorizedError(
      `User does not have access to region '${regionId}'`,
    );
  }

  try {
    await firebase.messaging().send({
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
      webpush: {
        fcmOptions: {
          link,
        },
      },
    });

    return json('OK');
  } catch (err) {
    throw new BadRequestError(
      `Failed to send message to FCM with '${unwrapError(err)}'`,
    );
  }
});

const assertPostFCMWebhookBody = (body: any): PostFCMWebhookBody => {
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

const assertPostFCMWebhookQuery = (query: any): PostFCMWebhookQuery => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.link !== 'string',
    new BadRequestError('Invalid link provided in query.'),
  );

  return query as PostFCMWebhookQuery;
};
