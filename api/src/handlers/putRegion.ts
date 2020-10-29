import { assert } from '@trail-status-app/utilities';
import RegionModel from '../models/RegionModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery, parseBody } from '../requests';

interface PutRegionQuery {
  regionId: string;
}

interface PutRegionBody {
  name: string;
  closeHashtag: string;
  openHashtag: string;
}

export default withApiHandler([P.SettingsRead], async event => {
  const { regionId } = assertPutRegionQuery(parseQuery(event));
  const { name, openHashtag, closeHashtag } = assertPutRegionBody(
    parseBody(event),
  );

  const region = await RegionModel.get(regionId);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${regionId}'`);
  }

  await region.save({
    name,
    openHashtag,
    closeHashtag,
  });

  return json(region);
});

const assertPutRegionQuery = (query: any): PutRegionQuery => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.regionId !== 'string',
    new BadRequestError('Missing regionId query parameter.'),
  );

  return query;
};

const assertPutRegionBody = (body: any): PutRegionBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.name !== 'string',
    new BadRequestError('Invalid name provided in body.'),
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
