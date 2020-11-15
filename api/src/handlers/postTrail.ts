import { assert } from '@trail-status-app/utilities';
import uuid from 'uuid/v4';
import RegionModel from '../models/RegionModel';
import TrailModel from '../models/TrailModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseBody } from '../requests';

interface PostTrailBody {
  name: string;
  regionId: string;
  closeHashtag: string;
}

export default withApiHandler([P.TrailCreate], async event => {
  const { name, regionId, closeHashtag } = assertPostTrailBody(
    parseBody(event),
  );

  // Ensure region exists.
  const region = await RegionModel.get(regionId);
  if (!region) {
    throw new NotFoundError(`Region not found for id '${regionId}'`);
  }

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

const assertPostTrailBody = (body: any): PostTrailBody => {
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
