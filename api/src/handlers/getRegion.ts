import { assert } from '@trail-status-app/utilities';
import RegionModel from '../models/RegionModel';
import TrailModel from '../models/TrailModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';

interface GetRegion {
  regionId: string;
}

export default withApiHandler([], async event => {
  const { regionId } = assertGetRegion(parseQuery(event));

  const region = await RegionModel.get(regionId);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${region}'`);
  }

  const trails = await TrailModel.allByRegion(region.id);

  return json({
    ...region.toJSON(),
    trails: trails.map(t => t.toJSON()),
  });
});

const assertGetRegion = (query: any): GetRegion => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.trailId !== 'string',
    new BadRequestError('Missing regionId query parameter.'),
  );

  return query;
};
