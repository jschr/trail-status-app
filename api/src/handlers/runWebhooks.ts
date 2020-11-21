import withSQSHandler from '../withSQSHandler';
import WebhookModel from '../models/WebhookModel';
import buildRegionStatus, { RegionStatus } from '../buildRegionStatus';
import runWebhook from '../runWebhook';

export default withSQSHandler(async event => {
  if (!Array.isArray(event?.Records) || !event.Records.length) {
    console.info(`Received empty messages, do nothing.`);
    return;
  }

  // Messages should be grouped by region id so cache the region status to
  // avoid unecessary lookups while processing the webhooks for a region.
  const getRegionStatus = createRegionStatusCache();

  for (const message of event.Records) {
    let webhookId: string | null = null;
    try {
      ({ webhookId } = JSON.parse(message.body));
    } catch (err) {
      console.error(`Failed to parse message body '${message.body}'`);
    }

    if (!webhookId) {
      console.error(`Missing webhookId in message body '${message.body}'`);
      continue;
    }

    const webhook = await WebhookModel.get(webhookId);
    if (!webhook) {
      console.error(`Failed to find webhook for '${webhookId}'`);
      continue;
    }

    const regionStatus = await getRegionStatus(webhook.regionId);
    if (!regionStatus) {
      console.warn(`Failed to find region status for '${webhook.regionId}'`);
      continue;
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

      // If the webhook fails throw an error. This triggers the message batch to be retried.
      // There should only be one message per batch but this handles multiple. If multiple
      // messages are sent in the batch and one fails, the entire batch is re-tried. Webhooks
      // should not expect to messages to be delivered only once.
      throw new Error(
        `Failed to process webhook '${webhook.id}', ${err.message}`,
      );
    }
  }
});

const createRegionStatusCache = () => {
  const cache: Record<string, RegionStatus | null> = {};

  return async (regionId: string) => {
    if (regionId in cache) {
      return cache[regionId];
    }
    const result = await buildRegionStatus(regionId);
    cache[regionId] = result;
    return result;
  };
};
