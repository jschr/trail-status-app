import * as SQS from '@aws-sdk/client-sqs';
import uuid from 'uuid/v4';
import withSQSHandler from '../withSQSHandler';
import RegionModel from '../models/RegionModel';
import RegionStatusModel from '../models/RegionStatusModel';
import RegionStatusHistoryModel from '../models/RegionStatusHistoryModel';
import UserModel from '../models/UserModel';
import TrailModel from '../models/TrailModel';
import TrailStatusModel from '../models/TrailStatusModel';
import WebhookModel from '../models/WebhookModel';
import * as instagram from '../clients/instagram';
import { unwrapError } from '../utilities';

const sqs = new SQS.SQS();
const runWebhooksQueueUrl = process.env.RUN_WEBHOOKS_QUEUE_URL;

if (!runWebhooksQueueUrl) {
  throw new Error(`Missing environment variable 'RUN_WEBHOOKS_QUEUE_URL'`);
}

export default withSQSHandler(async event => {
  if (!Array.isArray(event?.Records) || !event.Records.length) {
    console.info(`Received empty messages, do nothing.`);
    return;
  }

  for (const message of event.Records) {
    let userId: string | null = null;
    try {
      ({ userId } = JSON.parse(message.body));
    } catch (err) {
      console.error(`Failed to parse message body '${message.body}'`);
    }

    if (!userId) {
      console.error(`Missing userId in message body '${message.body}'`);
      continue;
    }

    try {
      await syncUser(userId);
    } catch (err) {
      // Throw the error to retry.
      throw new Error(
        `Failed to sync user '${userId}' with '${unwrapError(err)}'`,
      );
    }
  }
});

const syncUser = async (userId: string) => {
  const user = await UserModel.get(userId);
  if (!user) {
    throw new Error(`Failed to find user for '${userId}'`);
  }

  const accessToken = await getAccessToken(user);
  let userMedia = await instagram.getUserMedia(accessToken);

  // Ensure media is sorted by most recent.
  userMedia = userMedia.sort(
    (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp),
  );

  console.info(
    `Found user media for user '${user.id}':`,
    userMedia.map(media => ({
      id: media.id,
      caption: media.caption?.slice(0, 40),
      timestamp: media.timestamp,
    })),
  );

  const regions = await RegionModel.allByUser(userId);
  await Promise.all(
    regions.map(region => syncRegion(region, userMedia, accessToken)),
  );
};

const syncRegion = async (
  region: RegionModel,
  userMedia: instagram.UserMedia[],
  accessToken: string,
) => {
  console.info(`Syncing region '${region.id}' for user '${region.userId}'`);

  const [trails, webhooks] = await Promise.all([
    TrailModel.allByRegion(region.id),
    WebhookModel.allByRegion(region.id),
  ]);

  console.info(
    `Region '${region.id}' has ${trails.length} trails and ${webhooks.length} webhooks`,
  );

  let mediaWithOpenStatus: instagram.UserMedia | null = null;
  let mediaWithClosedStatus: instagram.UserMedia | null = null;
  let permalink = '';
  for (const media of userMedia) {
    if (hasHashtag(media, region.openHashtag)) {
      console.info(
        `Found open hashtag '${region.openHashtag}' for region '${region.id}'.`,
      );
      ({ permalink } = await instagram.getMedia(media.id, accessToken));
      mediaWithOpenStatus = media;
      break;
    } else if (hasHashtag(media, region.closeHashtag)) {
      console.info(
        `Found close hashtag '${region.closeHashtag}' for region '${region.id}'.`,
      );
      ({ permalink } = await instagram.getMedia(media.id, accessToken));
      mediaWithClosedStatus = media;
      break;
    }
  }

  if (mediaWithClosedStatus) {
    // Mark region as closed.
    await setRegionStatus(
      region,
      'closed',
      mediaWithClosedStatus,
      webhooks,
      permalink,
    );
    // Mark all trails as closed.
    await Promise.all(
      trails.map(trail => setTrailStatus(trail, 'closed', webhooks)),
    );
  } else if (mediaWithOpenStatus) {
    // Mark region as closed.
    await setRegionStatus(
      region,
      'open',
      mediaWithOpenStatus,
      webhooks,
      permalink,
    );
    // Mark all trails open except any that are closed.
    const openTrails: TrailModel[] = [];
    const closedTrails: TrailModel[] = [];
    for (const trail of trails) {
      if (
        trail.closeHashtag &&
        hasHashtag(mediaWithOpenStatus, trail.closeHashtag)
      ) {
        console.info(
          `Found close hashtag '${trail.closeHashtag}' for trail '${trail.id}' and region '${region.id}'.`,
        );
        closedTrails.push(trail);
      } else {
        openTrails.push(trail);
      }
    }

    await Promise.all([
      ...openTrails.map(trail => setTrailStatus(trail, 'open', webhooks)),
      ...closedTrails.map(trail => setTrailStatus(trail, 'closed', webhooks)),
    ]);
  } else {
    console.info(`No status found for region '${region.id}'.`);
  }
};

const getAccessToken = async (user: UserModel): Promise<string> => {
  // Instagram long lived tokens expire after 60 days.
  const accessTokenExpiresAt = +new Date(user.expiresAt);
  const twoWeeks = 1000 * 60 * 60 * 24 * 14;
  const now = +new Date();

  // Refresh access token if it expires in two weeks or less.
  if (accessTokenExpiresAt - now <= twoWeeks) {
    const { accessToken, expiresIn } = await instagram.refreshAccessToken(
      user.accessToken,
    );
    const expiresAt = new Date(+now + expiresIn * 1000);
    await user.save({ accessToken, expiresAt: expiresAt.toISOString() });
  }

  return user.accessToken;
};

const setRegionStatus = async (
  region: RegionModel,
  status: 'open' | 'closed',
  userMedia: instagram.UserMedia,
  webhooks: WebhookModel[],
  permalink: string,
) => {
  let regionStatus = await RegionStatusModel.get(region.id);

  if (!regionStatus) {
    regionStatus = new RegionStatusModel({
      id: region.id,
      createdAt: new Date().toISOString(),
    });
  }

  const message = stripHashtags(userMedia.caption || '');
  const didStatusChange = status !== regionStatus.status;
  const didMessageChange = message !== regionStatus.message;

  if (didStatusChange || didMessageChange) {
    console.info(
      `Setting region '${region.id}' status to '${status}' with message '${message}`,
    );

    const statusParams = {
      status,
      message,
      instagramPostId: userMedia.id,
      imageUrl: userMedia.mediaUrl,
      instagramPermalink: permalink,
    };

    await regionStatus.save(statusParams);

    if (didStatusChange) {
      const statusHistory = new RegionStatusHistoryModel({
        ...statusParams,
        id: uuid(),
        regionId: region.id,
        createdAt: new Date().toISOString(),
      });
      await statusHistory.save();
      console.info(`Created region status history for '${region.id}'`);

      const regionWebhooks = webhooks.filter(w => !w.trailId);
      console.info(
        `Found '${regionWebhooks.length}' webhooks for region '${region.id}'`,
      );
      await Promise.all(regionWebhooks.map(createWebhookJob));
    } else {
      // TODO: Still fire the webhook if the webhook url uses the message variable.
      console.info(
        `Region '${region.id}' has the same status but different message, skip creating webhook jpbs.`,
      );
    }
  } else {
    console.info(
      `Region '${region.id}' has the same status and message, skipping setting status.`,
    );
  }
};

const setTrailStatus = async (
  trail: TrailModel,
  status: 'open' | 'closed',
  webhooks: WebhookModel[],
) => {
  let trailStatus = await TrailStatusModel.get(trail.id);

  if (!trailStatus) {
    trailStatus = new TrailStatusModel({
      id: trail.id,
      createdAt: new Date().toISOString(),
    });
  }

  if (status !== trailStatus.status) {
    console.info(`Setting trail '${trail.id}' status to '${status}'`);
    await trailStatus.save({ status });
    const trailWebhooks = webhooks.filter(w => w.trailId === trail.id);

    console.info(
      `Found '${trailWebhooks.length}' webhooks for trail '${trail.id}' region '${trail.regionId}'`,
    );

    await Promise.all(trailWebhooks.map(createWebhookJob));
  } else {
    console.info(
      `Trail '${trail.id}' region '${trail.regionId}' has the same status, skipping setting status.`,
    );
  }
};

const createWebhookJob = async (webhook: WebhookModel) => {
  if (!webhook.enabled) {
    console.info(
      `Webhook '${webhook.id}' region '${webhook.regionId}' is not enabled, skip creating job`,
    );
    return;
  }

  const params: SQS.SendMessageRequest = {
    // Use webhook id as group id so each run webhook job can be retried individually.
    MessageGroupId: webhook.id,
    MessageDeduplicationId: webhook.id,
    MessageBody: JSON.stringify({ webhookId: webhook.id }),
    QueueUrl: runWebhooksQueueUrl,
  };

  try {
    await sqs.sendMessage(params);
    console.info(
      `Created webhook job for webhook '${webhook.id}' region '${webhook.regionId}'`,
    );
  } catch (err) {
    throw new Error(
      `Failed to create webhook job for '${webhook.id}' region '${
        webhook.regionId
      }' with '${unwrapError(err)}'`,
    );
  }
};

const hasHashtag = (media: instagram.UserMedia, hashtag: string) =>
  (media.caption || '').match(/#\w+/g)?.includes(hashtag) ?? false;

const stripHashtags = (value: string) =>
  value.replace(/\#[a-zA-Z0-9-]+(\s|\.|$)/g, '').trim();
