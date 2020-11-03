import * as AWS from 'aws-sdk';
import withSQSHandler from '../withSQSHandler';
import RegionModel from '../models/RegionModel';
import UserModel from '../models/UserModel';
import TrailModel from '../models/TrailModel';
import TrailStatusModel from '../models/TrailStatusModel';
import TrailWebhookModel from '../models/TrailWebhookModel';
import * as instagram from '../clients/instagram';

const sqs = new AWS.SQS();
const runTrailWebhooksQueueUrl = process.env.RUN_TRAIL_WEBHOOKS_QUEUE_URL;

if (!runTrailWebhooksQueueUrl) {
  throw new Error(
    `Missing environment variable 'RUN_TRAIL_WEBHOOKS_QUEUE_URL'`,
  );
}

export default withSQSHandler(async event => {
  if (!Array.isArray(event?.Records) || !event.Records.length) {
    console.info(`Received empty messages, do nothing.`);
    return;
  }

  for (const message of event.Records) {
    let regionId: string | null = null;
    try {
      ({ regionId } = JSON.parse(message.body));
    } catch (err) {
      console.error(`Failed to parse message body '${message.body}'`);
    }

    if (!regionId) {
      console.error(`Missing regionId in message body '${message.body}'`);
      continue;
    }

    try {
      await syncRegion(regionId);
    } catch (err) {
      console.error(err);
    }
  }
});

const syncRegion = async (regionId: string) => {
  const region = await RegionModel.get(regionId);
  if (!region) {
    throw new Error(`Failed to find region for '${regionId}'`);
  }

  const trails = await TrailModel.allByRegion(region.id);
  if (trails.length === 0) {
    throw new Error(`Failed to find trails for '${region.id}'`);
  }

  const user = await UserModel.get(region.userId);
  if (!user) {
    throw new Error(`Failed to find user for '${region.userId}'`);
  }

  const accessToken = await getAccessToken(user);
  let userMedia = await instagram.getUserMedia(accessToken);

  // Ensure media is sorted by most recent.
  userMedia = userMedia.sort(
    (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp),
  );

  let mediaWithOpenStatus: instagram.UserMedia | null = null;
  let mediaWithClosedStatus: instagram.UserMedia | null = null;
  for (const media of userMedia) {
    if (media.caption.includes(region.openHashtag)) {
      console.info(
        `Found open hashtag '${region.openHashtag}' for region '${region.id}'.`,
      );
      mediaWithOpenStatus = media;
      break;
    } else if (media.caption.includes(region.closeHashtag)) {
      console.info(
        `Found close hashtag '${region.closeHashtag}' for region '${region.id}'.`,
      );
      mediaWithClosedStatus = media;
      break;
    }
  }

  if (mediaWithClosedStatus) {
    console.info(`Region '${region.id}' is closed.`);
    // Mark all trails as closed.
    for (const trail of trails) {
      setTrailStatus(trail, 'closed', mediaWithClosedStatus);
    }
  } else if (mediaWithOpenStatus) {
    console.info(`Region '${region.id}' is open.`);
    // Mark all trails open except any that are closed.
    for (const trail of trails) {
      if (
        trail.closeHashtag &&
        mediaWithOpenStatus.caption.includes(trail.closeHashtag)
      ) {
        console.info(
          `Found close hashtag '${trail.closeHashtag}' for trail '${trail.id}'.`,
        );
      } else {
        setTrailStatus(trail, 'open', mediaWithOpenStatus);
      }
    }
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

const setTrailStatus = async (
  trail: TrailModel,
  status: 'open' | 'closed',
  media: instagram.UserMedia,
) => {
  let trailStatus = await TrailStatusModel.get(trail.id);

  if (!trailStatus) {
    trailStatus = new TrailStatusModel({
      id: trail.id,
      createdAt: new Date().toISOString(),
    });
  }

  const message = stripHashtags(media.caption);

  if (status !== trailStatus.status || message !== trailStatus.message) {
    await trailStatus.save({
      status,
      // TODO: These are the same for each trail in the region, move to RegionStatus?
      message,
      instagramPostId: media.id,
      imageUrl: media.mediaUrl,
    });

    console.info(
      `Setting trail '${trail.id}' status to '${status}' with message '${message}`,
    );

    const trailWebhooks = await TrailWebhookModel.allByTrail(trail.id);

    console.info(
      `Found '${trailWebhooks.length}' webhooks for trail '${trail.id}'`,
    );

    await Promise.all(trailWebhooks.map(createTrailWebhookJob));
  } else {
    console.info(
      `Trail '${trail.id}' has the same status and message, skipping setting status.`,
    );
  }
};

const createTrailWebhookJob = async (trailWebhook: TrailWebhookModel) => {
  const params: AWS.SQS.SendMessageRequest = {
    MessageGroupId: trailWebhook.trailId,
    MessageDeduplicationId: trailWebhook.id,
    MessageBody: JSON.stringify({ trailWebbookId: trailWebhook.id }),
    QueueUrl: runTrailWebhooksQueueUrl,
  };

  try {
    await sqs.sendMessage(params).promise();
    console.info(`Created trail webhook job for webhook '${trailWebhook.id}'`);
  } catch (err) {
    throw new Error(
      `Failed to create trail webhook job for '${trailWebhook.id}' with '${err.message}'`,
    );
  }
};

const stripHashtags = (value: string) =>
  value.replace(/\#[a-zA-Z0-9-]+(\s|\.|$)/g, '').trim();
