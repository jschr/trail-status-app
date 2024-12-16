import { assert } from '@trail-status-app/utilities';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import RegionModel from '../models/RegionModel';
import { BadRequestError, NotFoundError } from '../HttpError';
import firebase from '../clients/firebase';
import { parseBody } from '../requests';
import { unwrapError } from '../utilities';

interface PostSubscribeFCMBody {
  token: string;
  regionId: string;
}

export default withApiHandler([], async event => {
  const { token, regionId } = assertPostSubscribeFCMBody(parseBody(event));

  const region = await RegionModel.get(regionId);
  if (!region) {
    throw new NotFoundError(`Could not find region for '${regionId}'`);
  }

  const topic = `${regionId}_status`;

  try {
    await firebase.messaging().subscribeToTopic([token], topic);
    console.info(`Successfully subscribed to FCM topic '${topic}'`);
    return json('OK');
  } catch (err) {
    console.error(`Failed to subscribe from FCM topic '${topic}'`);
    throw new BadRequestError(
      `Failed to subscribe to FCM with '${unwrapError(err)}'`,
    );
  }
});

const assertPostSubscribeFCMBody = (body: any): PostSubscribeFCMBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.token !== 'string',
    new BadRequestError(`Invalid token provided in body.`),
  );

  assert(
    typeof body.regionId !== 'string',
    new BadRequestError(`Invalid regionId provided in body.`),
  );

  return body;
};
