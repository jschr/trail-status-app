import { assert } from '@trail-status-app/utilities';
import TrailStatusModel from '../models/TrailStatusModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';

interface GetTrailStatus {
  trailId: string;
}

export default withApiHandler([], async event => {
  const { trailId } = assertGetTrailStatus(parseQuery(event));
  const trailStatus = await TrailStatusModel.get(trailId);
  if (!trailStatus) {
    throw new NotFoundError(`Could not find trail status for '${trailId}'`);
  }

  return json(trailStatus);
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
