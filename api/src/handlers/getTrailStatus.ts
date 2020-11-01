import { assert } from '@trail-status-app/utilities';
import TrailStatusModel from '../models/TrailStatusModel';
import TrailModel from '../models/TrailModel';
import RegionModel from '../models/RegionModel';
import UserModel from '../models/UserModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';

interface GetTrailStatus {
  // TODO: Deprecate and use id instead once devices use new api.
  trailId: string;
}

export default withApiHandler([], async event => {
  const { trailId } = assertGetTrailStatus(parseQuery(event));
  const [trailStatus, trail] = await Promise.all([
    TrailStatusModel.get(trailId),
    TrailModel.get(trailId),
  ]);

  if (!trailStatus) {
    throw new NotFoundError(`Could not find trail status for '${trailId}'`);
  }

  if (!trail) {
    throw new NotFoundError(`Could not find trail settings for '${trailId}'`);
  }

  const region = await RegionModel.get(trail.regionId);
  if (!region) {
    throw new NotFoundError(`Could not find region for '${trail.regionId}'`);
  }

  const user = await UserModel.get(region.userId);
  if (!user) {
    throw new NotFoundError(`Could not find user for '${region.userId}'`);
  }

  return json({
    ...trailStatus.toJSON(),
    user: user.toJSON(),
  });
});

const assertGetTrailStatus = (query: any): GetTrailStatus => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.trailId !== 'string',
    new BadRequestError('Invalid trailId provided in query.'),
  );

  return query as GetTrailStatus;
};
