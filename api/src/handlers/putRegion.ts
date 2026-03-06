import { assert } from '@trail-status-app/utilities';
import {
    BadRequestError,
    NotFoundError,
    UnauthorizedError,
} from '../HttpError';
import { Permissions as P, canAccessRegion } from '../jwt';
import RegionModel from '../models/RegionModel';
import { parseBody, parseQuery } from '../requests';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';

interface PutRegionQuery {
  id: string;
}

interface PutRegionBody {
  name: string;
  closeHashtag: string;
  openHashtag: string;
  statusLookbackDays?: number | null;
}

export default withApiHandler([P.RegionUpdate], async event => {
  const { id } = assertPutRegionQuery(parseQuery(event));
  const { name, openHashtag, closeHashtag, statusLookbackDays } =
    assertPutRegionBody(parseBody(event));

  const region = await RegionModel.get(id);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${id}'`);
  }

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, region.id)) {
    throw new UnauthorizedError(
      `User does not have access to region '${region.id}'`,
    );
  }

  await region.save({
    name,
    openHashtag,
    closeHashtag,
    statusLookbackDays: statusLookbackDays ?? null,
  });

  return json(region);
});

const assertPutRegionQuery = (query: any): PutRegionQuery => {
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

  if (body.statusLookbackDays != null) {
    assert(
      typeof body.statusLookbackDays !== 'number' ||
        !Number.isInteger(body.statusLookbackDays) ||
        body.statusLookbackDays <= 0,
      new BadRequestError(
        'statusLookbackDays must be a positive integer or null.',
      ),
    );
  }

  return body;
};
