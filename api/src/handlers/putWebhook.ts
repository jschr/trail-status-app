import { assert } from '@trail-status-app/utilities';
import WebhookModel from '../models/WebhookModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery, parseBody } from '../requests';

interface PutWebhookQuery {
  id: string;
}

interface PutWebhookBody {
  name?: string;
  runPriority?: number;
  description?: string;
  method?: string;
  url?: string;
}

export default withApiHandler([P.WebhookCreate], async event => {
  const { id } = assertPutWebhookQuery(parseQuery(event));
  const body = assertPutWebhookBody(parseBody(event));
  const webhook = await WebhookModel.get(id);

  if (!webhook) {
    throw new NotFoundError(`Could not find webhook for '${id}'`);
  }

  // TODO: Ensure user has access to webhook's region.

  await webhook.save(body);

  return json(webhook);
});

const assertPutWebhookQuery = (query: any): PutWebhookQuery => {
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

const assertPutWebhookBody = (body: any): PutWebhookBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    'name' in body && typeof body.name !== 'string',
    new BadRequestError('Invalid name provided.'),
  );

  assert(
    'method' in body && typeof body.method !== 'string',
    new BadRequestError('Invalid method provided.'),
  );

  assert(
    'url' in body && typeof body.url !== 'string',
    new BadRequestError('Invalid url provided.'),
  );

  assert(
    'description' in body && typeof body.description !== 'string',
    new BadRequestError('Invalid description provided.'),
  );

  assert(
    'runPriority' in body && typeof body.runPriority !== 'number',
    new BadRequestError('Invalid runPriority provided.'),
  );

  return body;
};
