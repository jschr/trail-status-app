import { assert } from '@trail-status-app/utilities';
import TrailStatusModel from '../models/TrailStatusModel';
import RegionStatusModel from '../models/RegionStatusModel';
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

  if (!trail) {
    throw new NotFoundError(`Could not find trail settings for '${trailId}'`);
  }

  const [region, regionStatus] = await Promise.all([
    RegionModel.get(trail.regionId),
    RegionStatusModel.get(trail.regionId),
  ]);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${trail.regionId}'`);
  }

  const user = await UserModel.get(region.userId);
  if (!user) {
    throw new NotFoundError(`Could not find user for '${region.userId}'`);
  }

  return json({
    status: trailStatus?.status,
    message: regionStatus?.message,
    imageUrl: regionStatus?.imageUrl,
    instagramPostId: regionStatus?.instagramPostId,
    instagramPermalink: regionStatus?.instagramPermalink,
    updatedAt: trailStatus?.updatedAt,
    createdAt: trailStatus?.createdAt,
    user: {
      userId: user.id,
      username: user.username,
    },
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
