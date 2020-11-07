import { assert } from '@trail-status-app/utilities';
import TrailStatusModel from '../models/TrailStatusModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';

interface GetTrailStatus {
  id: string;
}

export default withApiHandler([], async event => {
  const { id } = assertGetTrailStatus(parseQuery(event));
  const trailStatus = await TrailStatusModel.get(id);

  if (!trailStatus) {
    throw new NotFoundError(`Could not find trail status for '${id}'`);
  }

  return json(trailStatus);
});

const assertGetTrailStatus = (query: any): GetTrailStatus => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.id !== 'string',
    new BadRequestError('Invalid id provided in query.'),
  );

  return query as GetTrailStatus;
};
