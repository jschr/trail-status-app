import RegionModel from './models/RegionModel';
import RegionStatusModel from './models/RegionStatusModel';
import TrailModel from './models/TrailModel';
import UserModel from './models/UserModel';
import TrailStatusModel from './models/TrailStatusModel';
import { NotFoundError } from './HttpError';

export interface RegionStatus {
  id: string;
  name: string;
  status: string;
  message: string;
  imageUrl: string;
  instagramPostId: string;
  instagramPermalink: string;
  updatedAt: string;
  trails: Array<TrailStatus>;
  user: {
    userId: string;
    username: string;
  };
}

export interface TrailStatus {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

const isNotNull = <T>(value: T | null): value is T => {
  return value !== null;
};

export default async (regionId: string): Promise<RegionStatus | null> => {
  const [region, regionStatus, trails] = await Promise.all([
    RegionModel.get(regionId),
    RegionStatusModel.get(regionId),
    TrailModel.allByRegion(regionId),
  ]);

  if (!region) {
    throw new NotFoundError(`Could not find region for '${regionId}'`);
  }

  if (!regionStatus) {
    // Region has not been sync'd yet.
    return null;
  }

  const user = await UserModel.get(region.userId);
  if (!user) {
    throw new NotFoundError(`Could not find user for '${region.userId}'`);
  }

  const trailStatuses = await Promise.all(
    (trails || []).map(t => TrailStatusModel.get(t.id)),
  );

  return {
    id: region.id,
    name: region.name,
    status: regionStatus.status,
    message: regionStatus.message,
    imageUrl: regionStatus.imageUrl,
    instagramPostId: regionStatus.instagramPostId,
    instagramPermalink: regionStatus.instagramPermalink,
    updatedAt: regionStatus.updatedAt,
    trails: trailStatuses
      .map(trailStatus => {
        if (!trailStatus) return null;
        const trail = (trails || []).find(t => t.id === trailStatus.id);
        if (!trail) return null;

        return {
          id: trail.id,
          name: trail.name,
          status: trailStatus.status,
          updatedAt: trailStatus.updatedAt,
        };
      })
      .filter(isNotNull),
    user: {
      userId: user.id,
      username: user.username,
    },
  };
};
