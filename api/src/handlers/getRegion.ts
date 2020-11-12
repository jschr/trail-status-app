import { assert } from '@trail-status-app/utilities';
import RegionModel from '../models/RegionModel';
import TrailModel from '../models/TrailModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';
import { Permissions as P } from '../jwt';

interface GetRegion {
  id: string;
}

export default withApiHandler([P.RegionRead], async event => {
  const { id } = assertGetRegion(parseQuery(event));

  const region = await RegionModel.get(id);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${region}'`);
  }

  // TODO: Ensure user has access to region.

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
    typeof query.id !== 'string',
    new BadRequestError('Missing id query parameter.'),
  );

  return query;
};
