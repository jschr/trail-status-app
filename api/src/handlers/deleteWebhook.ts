import { assert } from '@trail-status-app/utilities';
import WebhookModel from '../models/WebhookModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P, canAccessRegion } from '../jwt';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../HttpError';
import { parseQuery } from '../requests';

interface PutWebhookQuery {
  id: string;
}

export default withApiHandler([P.WebhookCreate], async event => {
  const { id } = assertPutWebhookQuery(parseQuery(event));
  const webhook = await WebhookModel.get(id);

  if (!webhook) {
    throw new NotFoundError(`Could not find webhook for '${id}'`);
  }

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, webhook.regionId)) {
    throw new UnauthorizedError(
      `User does not have access to region '${webhook.regionId}'`,
    );
  }

  await webhook.delete();

  return json('OK');
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
