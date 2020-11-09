import fetch from 'node-fetch';
import withSQSHandler from '../withSQSHandler';
import WebhookModel from '../models/WebhookModel';
import buildRegionStatus, { RegionStatus } from '../buildRegionStatus';

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

    // TODO: If webhook.trailId send status for trail rather than region.

    const res = await fetch(`${webhook.url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regionStatus),
    });

    // If the webhook fails throw an error. This triggers the message batch to be retried.
    // There should only be one message per batch but this handles multiple. If multiple
    // messages are sent in the batch and one fails, the entire batch is re-tried. Webhooks
    // should not expect to messages to be delivered only once.
    if (!res.ok) {
      const errorMessage = `Failed to process webhook '${webhookId}', invalid response '${res.status}' from '${webhook.url}'`;
      await webhook.save({
        lastRanAt: new Date().toISOString(),
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }

    await webhook.save({
      lastRanAt: new Date().toISOString(),
      error: '',
    });

    console.info(
      `Successfully ran webhook '${webhookId}', received status '${res.status}' from '${webhook.url}'`,
    );
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
