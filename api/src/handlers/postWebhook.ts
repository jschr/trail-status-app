import { assert } from '@trail-status-app/utilities';
import uuid from 'uuid/v4';
import WebhookModel from '../models/WebhookModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import { BadRequestError } from '../HttpError';
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

  // TODO: Ensure user has access to region.

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
