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
import { parseBody } from '../requests';
import buildRegionStatus from '../buildRegionStatus';
import runWebhook from '../runWebhook';

interface PostRunWebhookBody {
  webhookId: string;
}

export default withApiHandler([P.WebhookRun], async event => {
  const { webhookId } = assertPostRunWebhookBody(parseBody(event));

  const webhook = await WebhookModel.get(webhookId);
  if (!webhook) {
    throw new NotFoundError(`Webhook not found for id '${webhookId}'`);
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
      `Successfully ran webhook '${webhookId}', received status '${status}' from '${url}'`,
    );
  } catch (err) {
    await webhook.save({
      lastRanAt: new Date().toISOString(),
      error: err.message,
    });
  }

  return json(webhook);
});

const assertPostRunWebhookBody = (body: any): PostRunWebhookBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.webhookId !== 'string',
    new BadRequestError('Invalid webhookId provided.'),
  );

  return body;
};
