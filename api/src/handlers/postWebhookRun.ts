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
import buildRegionStatus from '../buildRegionStatus';
import runWebhook from '../runWebhook';
import { unwrapError } from '../utilities';

interface PutWebhookRunQuery {
  id: string;
}

export default withApiHandler([P.WebhookRun], async event => {
  const { id } = assertPostWebhookRunQuery(parseQuery(event));

  const webhook = await WebhookModel.get(id);
  if (!webhook) {
    throw new NotFoundError(`Webhook not found for id '${id}'`);
  }

  const regionStatus = await buildRegionStatus(webhook.regionId);
  if (!regionStatus) {
    throw new NotFoundError(
      `Failed to find region status for '${webhook.regionId}'`,
    );
  }

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, webhook.regionId)) {
    throw new UnauthorizedError(
      `User does not have access to region '${webhook.regionId}'`,
    );
  }

  try {
    const [status, url] = await runWebhook(webhook, regionStatus);

    await webhook.save({
      lastRanAt: new Date().toISOString(),
      error: '',
    });

    console.info(
      `Successfully ran webhook '${id}', received status '${status}' from '${url}'`,
    );
  } catch (err) {
    await webhook.save({
      lastRanAt: new Date().toISOString(),
      error: unwrapError(err),
    });
  }

  return json(webhook);
});

const assertPostWebhookRunQuery = (query: any): PutWebhookRunQuery => {
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
