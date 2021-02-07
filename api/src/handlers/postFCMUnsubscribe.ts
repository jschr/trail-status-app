import { assert } from '@trail-status-app/utilities';
import { json } from '../responses';
import RegionModel from '../models/RegionModel';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import firebase from '../clients/firebase';
import { parseBody } from '../requests';

interface PostUnsubscribeFCMBody {
  token: string;
  regionId: string;
}

export default withApiHandler([], async event => {
  const { token, regionId } = assertPostUnsubscribeFCMBody(parseBody(event));

  const region = await RegionModel.get(regionId);
  if (!region) {
    throw new NotFoundError(`Could not find region for '${regionId}'`);
  }

  const topic = `${regionId}_status`;

  try {
    await firebase.messaging().unsubscribeFromTopic([token], topic);
    console.info(`Successfully unsubscribed from FCM topic '${topic}'`);
    return json('OK');
  } catch (err) {
    console.error(`Failed to unsubscribed from FCM topic '${topic}'`);
    throw new BadRequestError(
      `Failed to unsubscribe to FCM with '${err.message}'`,
    );
  }
});

const assertPostUnsubscribeFCMBody = (body: any): PostUnsubscribeFCMBody => {
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
