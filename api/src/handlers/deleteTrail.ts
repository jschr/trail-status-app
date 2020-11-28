import { assert } from '@trail-status-app/utilities';
import TrailModel from '../models/TrailModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P, canAccessRegion } from '../jwt';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../HttpError';
import { parseQuery } from '../requests';

interface PutTrailQuery {
  id: string;
}

export default withApiHandler([P.TrailUpdate], async event => {
  const { id } = assertPutTrailQuery(parseQuery(event));

  const trail = await TrailModel.get(id);

  if (!trail) {
    throw new NotFoundError(`Could not find trail for '${id}'`);
  }

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, trail.regionId)) {
    throw new UnauthorizedError(
      `User does not have access to region '${trail.regionId}'`,
    );
  }

  await trail.delete();

  return json('OK');
});

const assertPutTrailQuery = (query: any): PutTrailQuery => {
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
