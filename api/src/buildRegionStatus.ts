import fetch from 'node-fetch';
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
  openHashtag: string;
  closeHashtag: string;
  imageUrl: string;
  instagramPostId: string;
  instagramPermalink: string;
  updatedAt: string;
  airTemp: number | null;
  groundTemp: number | null;
  trails: Array<TrailStatus>;
  user: {
    userId: string;
    username: string;
  };
}

export interface TrailStatus {
  id: string;
  name: string;
  closeHashtag: string;
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

  const [user, trailStatuses, airTemp, groundTemp] = await Promise.all([
    UserModel.get(region.userId),
    Promise.all((trails || []).map(t => TrailStatusModel.get(t.id))),
    // Make sure we never throw when fetching temps.
    getAirTemp(region).catch(() => null),
    getGroundTemp(region).catch(() => null),
  ]);

  if (!user) {
    throw new NotFoundError(`Could not find user for '${region.userId}'`);
  }

  return {
    id: region.id,
    name: region.name,
    status: regionStatus.status,
    message: regionStatus.message,
    openHashtag: region.openHashtag,
    closeHashtag: region.closeHashtag,
    imageUrl: regionStatus.imageUrl,
    instagramPostId: regionStatus.instagramPostId,
    instagramPermalink: regionStatus.instagramPermalink,
    updatedAt: regionStatus.updatedAt,
    airTemp,
    groundTemp,
    trails: (trailStatuses || [])
      .map(trailStatus => {
        if (!trailStatus) return null;
        const trail = (trails || []).find(t => t.id === trailStatus.id);
        if (!trail) return null;

        return {
          id: trail.id,
          name: trail.name,
          closeHashtag: trail.closeHashtag,
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

const getAirTemp = async (region: RegionModel): Promise<number | null> => {
  if (!region.airTempChannelId) return null;

  const data = await getThinkSpeakChannelData(region.airTempChannelId);
  if (!data) return null;

  const latest = data.feeds[0];
  if (!latest) return null;

  if (isStaleMetric(latest.created_at)) return null;

  const temp = Math.round(parseFloat(latest.field3));
  if (isNaN(temp)) return null;

  return temp;
};

const getGroundTemp = async (region: RegionModel): Promise<number | null> => {
  if (!region.groundTempChannelId) return null;

  const data = await getThinkSpeakChannelData(region.groundTempChannelId);
  if (!data) return null;

  const latest = data.feeds[0];
  if (!latest) return null;

  if (isStaleMetric(latest.created_at)) return null;

  const temp = Math.round(parseFloat(latest.field2));
  if (isNaN(temp)) return null;

  return temp;
};

const isStaleMetric = (metricDate: string) => {
  const now = new Date();
  const createdAt = new Date(metricDate);
  // Metric is stale if created at is > 4 hours ago.
  return +now - +createdAt > 1000 * 60 * 60 * 4;
};

export interface DeviceChannel {
  channel: {
    id: string;
    name: string;
    description: string;
    last_entry_id: number;
    created_at: string;
    updated_at: string;
  } & Fields;
  feeds: Array<{ entry_id: string; created_at: string } & Fields>;
}

interface Fields {
  field1: string;
  field2: string;
  field3: string;
  field4: string;
  field5: string;
  field6: string;
  field7: string;
  field8: string;
}

const channelCache: {
  [channelId: string]: { data: DeviceChannel; lastFetched: Date };
} = {};

const getThinkSpeakChannelData = async (
  channelId: string,
): Promise<DeviceChannel | null> => {
  const cachedData = channelCache[channelId];

  if (cachedData) {
    const ttl = 1000 * 60 * 5; // 5 minutes;
    if (+new Date() - +cachedData.lastFetched < ttl) {
      console.info(`Using cached data for channel id '${channelId}'`);
      return cachedData.data;
    }
  }

  console.info(`Fetching data for channel id '${channelId}'`);

  const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=1&timezone=America%2FNew_York`;
  const resp = await fetch(url);

  if (!resp.ok) {
    console.error(
      `Failed to fetch channel from ${url} with status ${resp.status}`,
    );
    return null;
  }

  try {
    const data = await resp.json();
    if (!data) {
      throw new Error('Missing channel data');
    }
    if (!Array.isArray(data.feeds)) {
      throw new Error('Missing channel feed data');
    }
    if (!data.feeds[0]) {
      throw new Error('Missing latest channel feed data');
    }
    if (!data.feeds[0].created_at) {
      throw new Error('Missing created_at in latest channel feed data');
    }

    channelCache[channelId] = { data, lastFetched: new Date() };

    return data;
  } catch (err) {
    console.error(`Failed to parse channel from ${url} with '${err.message}'`);
    return null;
  }
};
