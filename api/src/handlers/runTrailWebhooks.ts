import fetch from 'node-fetch';
import withSQSHandler from '../withSQSHandler';
import TrailWebhookModel from '../models/TrailWebhookModel';
import TrailStatusModel from '../models/TrailStatusModel';

export default withSQSHandler(async event => {
  if (!Array.isArray(event?.Records) || !event.Records.length) {
    console.info(`Received empty messages, do nothing.`);
    return;
  }

  // Messages should be grouped by trail id so cache the trail status to
  // avoid unecessary db lookups while processing the webhooks for a trail.
  const getTrailStatus = createTrailStatusCache();

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

    const webhook = await TrailWebhookModel.get(webhookId);
    if (!webhook) {
      console.error(`Failed to find webhook for '${webhookId}'`);
      continue;
    }

    const trailStatus = await getTrailStatus(webhook.trailId);
    if (!trailStatus) {
      console.error(`Failed to find trail for '${webhook.trailId}'`);
      continue;
    }

    const res = await fetch(`${webhook.url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trailStatus),
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

const createTrailStatusCache = () => {
  const cache: Record<string, TrailStatusModel | null> = {};
  return async (trailId: string) => {
    if (trailId in cache) {
      return cache[trailId];
    }
    const result = await TrailStatusModel.get(trailId);
    cache[trailId] = result;
    return result;
  };
};
