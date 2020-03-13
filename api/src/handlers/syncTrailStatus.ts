import TrailSettingsModel from '../models/TrailSettingsModel';
import TrailStatusModel from '../models/TrailStatusModel';
import UserModel from '../models/UserModel';
import * as instagram from '../clients/instagram';
import withScheduledHandler from '../withScheduledHandler';

interface TrailUpdateResult {
  trailId: string;
  status?: any;
  message?: any;
  success?: boolean;
  failed?: boolean;
  reason?: string;
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

    for (const { caption } of userMedia) {
      if (caption.includes(trailSettings.openHashtag)) {
        status = 'open';
        message = stripHashtags(caption) || 'The trails are opened.';
        break;
      }

      if (caption.includes(trailSettings.closeHashtag)) {
        status = 'closed';
        message = stripHashtags(caption) || 'The trails are closed.';
        break;
      }
    }

    if (status !== trailStatus.status || status !== trailStatus.message) {
      await trailStatus.save({ status, message });
      await trailSettings.save({
        syncPriority: +new Date(),
        lastSyncdAt: new Date().toISOString(),
      });
    }

    return {
      trailId: trailSettings.trailId,
      success: true,
      status,
      message,
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
