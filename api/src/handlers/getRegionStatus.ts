import { assert } from '@trail-status-app/utilities';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError } from '../HttpError';
import { parseQuery } from '../requests';
import buildRegionStatus from '../buildRegionStatus';

interface GetRegionStatusQuery {
  id: string;
}

export default withApiHandler([], async event => {
  const { id } = assertGetRegionStatusQuery(parseQuery(event));
  const regionStatus = await buildRegionStatus(id);
  return json(regionStatus);
});

const assertGetRegionStatusQuery = (query: any): GetRegionStatusQuery => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.id !== 'string' || query.id.length === 0,
    new BadRequestError('Invalid id provided in query.'),
  );

  return query as GetRegionStatusQuery;
};
