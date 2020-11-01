import { assert } from '@trail-status-app/utilities';
import uuid from 'uuid/v4';
import TrailModel from '../models/TrailModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import { BadRequestError } from '../HttpError';
import { parseBody } from '../requests';

interface PostTrailsBody {
  name: string;
  regionId: string;
  closeHashtag: string;
}

export default withApiHandler([P.TrailsCreate], async event => {
  const { name, regionId, closeHashtag } = assertPostTrailsBody(
    parseBody(event),
  );

  // TODO: Ensure user has access to region.

  const trail = new TrailModel({
    id: uuid(),
    name,
    regionId,
    closeHashtag,
    createdAt: new Date().toISOString(),
  });

  await trail.save();

  return json(trail);
});

const assertPostTrailsBody = (body: any): PostTrailsBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.regionId !== 'string',
    new BadRequestError('Invalid regionId provided in body.'),
  );

  assert(
    typeof body.name !== 'string',
    new BadRequestError('Invalid name provided in body.'),
  );

  assert(
    typeof body.closeHashtag !== 'string',
    new BadRequestError('Invalid closeHashtag provided in body.'),
  );

  return body;
};
