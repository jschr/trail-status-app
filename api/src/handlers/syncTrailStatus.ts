import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import TrailSettingsModel from '../models/TrailSettingsModel';
import TrailStatusModel from '../models/TrailStatusModel';
import UserModel from '../models/UserModel';
import * as instagram from '../clients/instagram';

interface TrailUpdateResult {
  trailId: string;
  success?: boolean;
  status?: any;
  failed?: boolean;
  reason?: string;
}

export default withApiHandler([P.StatusSync], async () => {
  const trailSettingsToUpdate = await TrailSettingsModel.getNextBatchToSync();

  const updateResults = await Promise.all(
    trailSettingsToUpdate.map(updateTrailStatus),
  );

  return json(updateResults);
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

    for (const { caption } of userMedia) {
      if (caption.includes(trailSettings.openHashtag)) {
        status = 'open';
        break;
      }

      if (caption.includes(trailSettings.closeHashtag)) {
        status = 'closed';
        break;
      }
    }

    if (status !== trailStatus.status) {
      await trailStatus.save({ status });
      await trailSettings.save({
        syncPriority: +new Date(),
        lastSyncdAt: new Date().toISOString(),
      });
    }

    return {
      trailId: trailSettings.trailId,
      success: true,
      status,
    };
  } catch (err) {
    return {
      trailId: trailSettings.trailId,
      failed: true,
      reason: err.message,
    };
  }
};
