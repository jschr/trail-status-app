import { assert } from '@trail-status-app/utilities';
import TrailModel from '../models/TrailModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery, parseBody } from '../requests';

interface PutTrailQuery {
  id: string;
}

interface PutTrailsBody {
  name: string;
  closeHashtag: string;
}

export default withApiHandler([P.TrailUpdate], async event => {
  const { id } = assertPutTrailQuery(parseQuery(event));
  const { name, closeHashtag } = assertPutTrailsBody(parseBody(event));

  const trail = await TrailModel.get(id);

  if (!trail) {
    throw new NotFoundError(`Could not find trail for '${id}'`);
  }

  // TODO: Ensure user has access to trail.

  await trail.save({
    name,
    closeHashtag,
  });

  return json(trail);
});

const assertPutTrailQuery = (query: any): PutTrailQuery => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.id !== 'string',
    new BadRequestError('Missing regionId query parameter.'),
  );

  return query;
};

const assertPutTrailsBody = (body: any): PutTrailsBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.openHashtag !== 'string',
    new BadRequestError('Invalid openHashtag provided in body.'),
  );

  assert(
    typeof body.closeHashtag !== 'string',
    new BadRequestError('Invalid closeHashtag provided in body.'),
  );

  return body;
};
