import * as SQS from '@aws-sdk/client-sqs';
import uuid from 'uuid/v4';
import { assert } from '@trail-status-app/utilities';
import withApiHandler from '../withApiHandler';
import RegionModel from '../models/RegionModel';
import RegionStatusModel from '../models/RegionStatusModel';
import RegionStatusHistoryModel from '../models/RegionStatusHistoryModel';
import TrailModel from '../models/TrailModel';
import TrailStatusModel from '../models/TrailStatusModel';
import WebhookModel from '../models/WebhookModel';
import * as instagram from '../clients/instagram';
import { Permissions as P, canAccessRegion } from '../jwt';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../HttpError';
import { parseBody, parseQuery } from '../requests';
import { json } from '../responses';
import { unwrapError } from '../utilities';

const sqs = new SQS.SQS();
const runWebhooksQueueUrl = process.env.RUN_WEBHOOKS_QUEUE_URL;

if (!runWebhooksQueueUrl) {
  throw new Error(`Missing environment variable 'RUN_WEBHOOKS_QUEUE_URL'`);
}

interface PostRegionStatusQuery {
  id: string;
}

interface PostRegionStatusBody {
  instagramPost: {
    caption: string;
  };
}

export default withApiHandler([P.RegionUpdate], async event => {
  const { id } = assertPutRegionQuery(parseQuery(event));
  const { instagramPost } = assertPutRegionBody(parseBody(event));

  const region = await RegionModel.get(id);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${id}'`);
  }

  // Ensure user has access to region.
  if (!canAccessRegion(event.decodedToken, region.id)) {
    throw new UnauthorizedError(
      `User does not have access to region '${region.id}'`,
    );
  }

  await syncRegion(region, [
    {
      id: '',
      mediaUrl: '',
      caption: instagramPost.caption,
      timestamp: new Date().toISOString(),
    },
  ]);

  return json({});
});

const assertPutRegionQuery = (query: any): PostRegionStatusQuery => {
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

const assertPutRegionBody = (body: any): PostRegionStatusBody => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.'),
  );

  assert(
    typeof body.instagramPost.caption !== 'string',
    new BadRequestError('Missing instagramPost.caption in body.'),
  );

  return body;
};

const syncRegion = async (
  region: RegionModel,
  userMedia: instagram.UserMedia[],
  // accessToken: string,
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
      // ({ permalink } = await instagram.getMedia(media.id, accessToken));
      mediaWithOpenStatus = media;
      break;
    } else if (hasHashtag(media, region.closeHashtag)) {
      console.info(
        `Found close hashtag '${region.closeHashtag}' for region '${region.id}'.`,
      );
      // ({ permalink } = await instagram.getMedia(media.id, accessToken));
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
