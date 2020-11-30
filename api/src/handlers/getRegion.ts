import { assert } from '@trail-status-app/utilities';
import RegionModel from '../models/RegionModel';
import TrailModel from '../models/TrailModel';
import WebhookModel from '../models/WebhookModel';
import UserModel from '../models/UserModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../HttpError';
import { parseQuery } from '../requests';
import { Permissions as P, canAccessRegion } from '../jwt';

interface GetRegionQuery {
  id: string;
}

export default withApiHandler([P.RegionRead], async event => {
  const { id } = assertGetRegionQuery(parseQuery(event));

  const region = await RegionModel.get(id);
  if (!region) {
    throw new NotFoundError(`Could not find region for '${region}'`);
  }

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, region.id)) {
    throw new UnauthorizedError(
      `User does not have access to region '${region.id}'`,
    );
  }

  const [trails, webhooks, user] = await Promise.all([
    TrailModel.allByRegion(region.id),
    WebhookModel.allByRegion(region.id),
    UserModel.get(region.userId),
  ]);

  return json({
    ...region.toJSON(),
    trails: trails.map(t => t.toJSON()),
    webhooks: webhooks.map(w => w.toJSON()),
    user: {
      username: user?.username,
    },
  });
});

const assertGetRegionQuery = (query: any): GetRegionQuery => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.id !== 'string',
    new BadRequestError('Missing id query parameter.'),
  );

  return query;
};
