import { assert } from '@trail-status-app/utilities';
import uuid from 'uuid/v4';
import RegionModel from '../models/RegionModel';
import TrailModel from '../models/TrailModel';
import WebhookModel from '../models/WebhookModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P, canAccessRegion } from '../jwt';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../HttpError';
import { parseBody } from '../requests';

interface PostWebhookBody {
  name: string;
  regionId: string;
  trailId?: string;
  runPriority?: number;
  description?: string;
  method: string;
  url: string;
}

export default withApiHandler([P.WebhookCreate], async event => {
  const {
    name,
    regionId,
    method,
    url,
    trailId = '',
    runPriority = 0,
    description = '',
  } = assertPostWebhookBody(parseBody(event));

  // Ensure region exists.
  const region = await RegionModel.get(regionId);
  if (!region) {
    throw new NotFoundError(`Region not found for id '${regionId}'`);
  }

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, region.id)) {
    throw new UnauthorizedError(
      `User does not have access to region '${region.id}'`,
    );
  }

  // Ensure trail exists if provided.
  if (trailId) {
    const trail = await TrailModel.get(trailId);
    if (!trail) {
      throw new NotFoundError(`Trail not found for id '${trailId}'`);
    }
  }

  const webhook = new WebhookModel({
    id: uuid(),
    name,
    regionId,
    trailId,
    runPriority,
    description,
    method,
    url,
    createdAt: new Date().toISOString(),
  });

  await webhook.save();

  return json(webhook);
});

const assertPostWebhookBody = (body: any): PostWebhookBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.name !== 'string',
    new BadRequestError('Invalid name provided.'),
  );

  assert(
    typeof body.method !== 'string',
    new BadRequestError('Invalid method provided.'),
  );

  assert(
    typeof body.url !== 'string',
    new BadRequestError('Invalid url provided.'),
  );

  assert(
    'description' in body && typeof body.description !== 'string',
    new BadRequestError('Invalid description provided.'),
  );

  assert(
    'trailId' in body && typeof body.trailId !== 'string',
    new BadRequestError('Invalid trailId provided.'),
  );

  assert(
    'runPriority' in body && typeof body.runPriority !== 'number',
    new BadRequestError('Invalid runPriority provided.'),
  );

  return body;
};
