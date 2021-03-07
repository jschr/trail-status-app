import { assert } from '@trail-status-app/utilities';
import RegionStatusHistoryModel from '../models/RegionStatusHistoryModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';

interface GetRegionHistoryQuery {
  id: string;
}

export default withApiHandler([], async event => {
  const { id } = assertGetRegionHistoryQuery(parseQuery(event));
  const regionStatusHistory = await RegionStatusHistoryModel.allByRegion(id);

  if (!regionStatusHistory) {
    throw new NotFoundError(`Could not find region status history for '${id}'`);
  }

  return json(regionStatusHistory);
});

const assertGetRegionHistoryQuery = (query: any): GetRegionHistoryQuery => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.id !== 'string',
    new BadRequestError('Invalid id provided in query.'),
  );

  return query as GetRegionHistoryQuery;
};
