import * as AWS from 'aws-sdk';
import TrailSettingsModel from '../models/TrailSettingsModel';
import TrailStatusModel from '../models/TrailStatusModel';
import UserModel from '../models/UserModel';
import WebhookModel from '../models/WebhookModel';
import * as instagram from '../clients/instagram';
import withScheduledHandler from '../withScheduledHandler';

interface TrailUpdateResult {
  trailId: string;
  status?: string;
  message?: string;
  imageUrl?: string;
  success?: boolean;
  failed?: boolean;
  reason?: string;
  skipped?: boolean;
  webhookJobsCreated?: number;
}

const sqs = new AWS.SQS();
const webhookQueueUrl = process.env.WEBHOOK_QUEUE_URL;
if (!webhookQueueUrl) {
  // Log error but don't throw.
  console.error(`Missing environment variable 'WEBHOOK_QUEUE_URL'`);
}

export default withScheduledHandler(async () => {
  const trailSettingsToUpdate = await TrailSettingsModel.getNextBatchToSync();

  const updateResults = await Promise.all(
    trailSettingsToUpdate.map(updateTrailStatus),
  );

  console.log(`Sync results: ${JSON.stringify(updateResults, null, '  ')}`);
});

const updateTrailStatus = async (
  trailSettings: TrailSettingsModel,
): Promise<TrailUpdateResult> => {
  try {
    const user = await UserModel.get(trailSettings.userId);
    if (!user) {
      throw new Error(
        `Could not find user '${trailSettings.userId}' for trail id ${trailSettings.trailId}`,
      );
    }

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

    let trailStatus = await TrailStatusModel.get(trailSettings.trailId);
    if (!trailStatus) {
      trailStatus = new TrailStatusModel({
        trailId: trailSettings.trailId,
        createdAt: new Date().toISOString(),
      });
    }

    const userMedia = await instagram.getUserMedia(user.accessToken);
    let status: string | undefined;
    let message: string | undefined;
    let imageUrl: string | undefined;
    let instagramPostId: string | undefined;
    let webhookJobsCreated: number | undefined;
    let skipped = true;

    for (const { id, caption, mediaUrl } of userMedia) {
      if (caption.includes(trailSettings.openHashtag)) {
        status = 'open';
        message = stripHashtags(caption) || 'The trails are open.';
        imageUrl = mediaUrl || '';
        instagramPostId = id;
        break;
      }

      if (caption.includes(trailSettings.closeHashtag)) {
        status = 'closed';
        message = stripHashtags(caption) || 'The trails are closed.';
        imageUrl = mediaUrl || '';
        instagramPostId = id;
        break;
      }
    }

    if (
      status !== trailStatus.status ||
      message !== trailStatus.message ||
      instagramPostId !== trailStatus.instagramPostId
    ) {
      let instagramPermalink = trailStatus.instagramPermalink;
      if (instagramPostId && instagramPostId !== trailStatus.instagramPostId) {
        console.info(`Fetching instagram media for id ${instagramPostId}`);
        const media = await instagram.getMedia(
          instagramPostId,
          user.accessToken,
        );
        instagramPermalink = media.permalink;
      }

      console.info(`Updating status for trail id ${trailStatus.trailId}`, {
        statusChanged: status !== trailStatus.status,
        messageChanged: message !== trailStatus.message,
        imageUrlChanged: imageUrl !== trailStatus.imageUrl,
        instagramPostIdChange: instagramPostId !== trailStatus.instagramPostId,
        instagramPermalinkChange:
          instagramPermalink !== trailStatus.instagramPermalink,
      });

      await trailStatus.save({
        status,
        message,
        imageUrl,
        instagramPostId,
        instagramPermalink,
      });

      await trailSettings.save({
        syncPriority: +new Date(),
        lastSyncdAt: new Date().toISOString(),
      });

      const webhooks = await WebhookModel.getTrailWebhooks(
        trailSettings.trailId,
      );

      await Promise.all(webhooks.map(createWebhookJob));
      webhookJobsCreated = webhooks.length;

      skipped = false;
    }

    return {
      trailId: trailSettings.trailId,
      success: true,
      status,
      message,
      imageUrl,
      skipped,
      webhookJobsCreated,
    };
  } catch (err) {
    return {
      trailId: trailSettings.trailId,
      failed: true,
      reason: err.message,
    };
  }
};

const createWebhookJob = async (webhook: WebhookModel) => {
  if (!webhookQueueUrl) return;

  const params: AWS.SQS.SendMessageRequest = {
    MessageGroupId: webhook.trailId,
    MessageDeduplicationId: webhook.webhookId,
    MessageBody: JSON.stringify({ webhookId: webhook.webhookId }),
    QueueUrl: webhookQueueUrl,
  };

  try {
    await sqs.sendMessage(params).promise();
  } catch (err) {
    throw new Error(
      `Failed to create webhook job for '${webhook.webhookId}' with '${err.message}'`,
    );
  }
};

const stripHashtags = (value: string) =>
  value.replace(/\#[a-zA-Z0-9-]+(\s|\.|$)/g, '').trim();
