import RegionModel from './models/RegionModel';
import RegionStatusModel from './models/RegionStatusModel';
import TrailModel from './models/TrailModel';
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
}

export interface TrailStatus {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  createdAt: string;
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

  const trailStatuses = await Promise.all(
    (trails || []).map(t => TrailStatusModel.get(t.id)),
  );

  return {
    ...regionStatus.toJSON(),
    name: region.name,
    trails: trailStatuses
      .map(ts => {
        if (!ts) return null;
        const trail = (trails || []).find(t => t.id === ts.id);
        if (!trail) return null;

        return {
          ...ts.toJSON(),
          name: trail.name,
        };
      })
      .filter(isNotNull),
  };
};
