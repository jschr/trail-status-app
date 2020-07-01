import TrailSettingsModel from '../models/TrailSettingsModel';
import TrailStatusModel from '../models/TrailStatusModel';
import UserModel from '../models/UserModel';
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
      console.info(`Updating status for trail id ${trailStatus.trailId}`, {
        statusChanged: status !== trailStatus.status,
        messageChanged: message !== trailStatus.message,
        imageUrlChanged: imageUrl !== trailStatus.imageUrl,
        instagramPostIdChange: instagramPostId !== trailStatus.instagramPostId,
      });

      await trailStatus.save({
        status,
        message,
        imageUrl,
        instagramPostId,
      });

      await trailSettings.save({
        syncPriority: +new Date(),
        lastSyncdAt: new Date().toISOString(),
      });

      skipped = false;
    }

    return {
      trailId: trailSettings.trailId,
      success: true,
      status,
      message,
      imageUrl,
      skipped,
    };
  } catch (err) {
    return {
      trailId: trailSettings.trailId,
      failed: true,
      reason: err.message,
    };
  }
};

const stripHashtags = (value: string) =>
  value.replace(/\#[a-zA-Z0-9-]+(\s|\.|$)/g, '').trim();
