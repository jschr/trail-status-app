import { assert } from '@trail-status-app/utilities';
import RegionModel from '../models/RegionModel';
import RegionStatusModel from '../models/RegionStatusModel';
import TrailModel from '../models/TrailModel';
import TrailStatusModel from '../models/TrailStatusModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';

interface GetRegionStatus {
  id: string;
}

export default withApiHandler([], async event => {
  const { id } = assertGetRegionStatus(parseQuery(event));
  const [region, regionStatus, trails] = await Promise.all([
    RegionModel.get(id),
    RegionStatusModel.get(id),
    TrailModel.allByRegion(id),
  ]);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${id}'`);
  }

  if (!regionStatus) {
    throw new NotFoundError(`Could not find region status for '${id}'`);
  }

  if (!trails) {
    throw new NotFoundError(`Could not find trails for region '${id}'`);
  }

  const trailStatuses = await Promise.all(
    trails.map(t => TrailStatusModel.get(t.id)),
  );

  return json({
    ...regionStatus.toJSON(),
    name: region.name,
    trails: trailStatuses
      .map(ts => {
        if (!ts) return null;
        const trail = trails.find(t => t.id === ts.id);
        if (!trail) return null;

        return {
          ...ts.toJSON(),
          name: trail.name,
        };
      })
      .filter(isNotNull),
  });
});

const assertGetRegionStatus = (query: any): GetRegionStatus => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.id !== 'string' || query.id.length === 0,
    new BadRequestError('Invalid id provided in query.'),
  );

  return query as GetRegionStatus;
};

const isNotNull = <T>(value: T | null): value is T => {
  return value !== null;
};
