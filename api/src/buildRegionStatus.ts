import { TimestreamQuery } from '@aws-sdk/client-timestream-query';
import { env } from '@trail-status-app/utilities';
import RegionModel from './models/RegionModel';
import RegionStatusModel from './models/RegionStatusModel';
import TrailModel from './models/TrailModel';
import UserModel from './models/UserModel';
import TrailStatusModel from './models/TrailStatusModel';
import { NotFoundError } from './HttpError';
import { unwrapError } from './utilities';

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

  const [user, trailStatuses, weatherData] = await Promise.all([
    UserModel.get(region.userId),
    Promise.all((trails || []).map(t => TrailStatusModel.get(t.id))),
    getWeatherData(region.timestreamId),
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
    airTemp: weatherData?.airTemp || null,
    groundTemp: weatherData?.groundTemp || null,
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

interface WeatherData {
  airTemp: number | null;
  groundTemp: number | null;
}

const weatherCache: {
  [id: string]: { data: WeatherData; lastFetched: Date };
} = {};

export const getWeatherData = async (id: string): Promise<WeatherData> => {
  try {
    if (!id) return { airTemp: null, groundTemp: null };

    const cache = weatherCache[id];

    if (cache) {
      const ttl = 1000 * 60 * 15; // 15 minutes;
      if (+new Date() - +cache.lastFetched < ttl) {
        console.info(`Using cached data for id '${id}'`);
        return cache.data;
      }
    }

    const timestreamQuery = new TimestreamQuery({
      region: env('TIMESTREAM_REGION'),
      credentials: {
        accessKeyId: env('TIMESTREAM_ACCESS_KEY_ID'),
        secretAccessKey: env('TIMESTREAM_SECRET_ACCESS_KEY'),
      },
    });

    const params = {
      QueryString: `
    WITH latest_recorded_time AS (
      SELECT
          measure_name,
          max(time) as latest_time
      FROM "TMS"."WeatherData"
      WHERE time >= ago(4h) AND id = '${id}'
      GROUP BY measure_name
    )
    SELECT
      b.measure_name,
      b.measure_value::double as last_reported_double,
      b.measure_value::bigint as last_reported_bigint,
      b.time,
      b.id,
      b.type,
      b.location
    FROM
    latest_recorded_time a INNER JOIN "TMS"."WeatherData" b
    ON a.measure_name = b.measure_name AND b.time = a.latest_time
    WHERE b.time > ago(4h) AND id = '${id}'
    ORDER BY b.measure_name`,
    };

    const results = await timestreamQuery.query(params);

    const airTempRow = results.Rows?.find(
      r => r.Data?.[0]?.ScalarValue === 'temperature',
    );
    const airTempValue = parseInt(airTempRow?.Data?.[1]?.ScalarValue || '', 10);

    const groundTempRow = results.Rows?.find(
      r => r.Data?.[0]?.ScalarValue === 'groundtemperature',
    );
    const groundTempValue = parseInt(
      groundTempRow?.Data?.[1]?.ScalarValue || '',
      10,
    );

    const data = {
      airTemp: isNaN(airTempValue) ? null : airTempValue,
      groundTemp: isNaN(groundTempValue) ? null : groundTempValue,
    };

    weatherCache[id] = { data, lastFetched: new Date() };

    console.info(`Fetched timestream data for id '${id}'`);

    return data;
  } catch (err) {
    console.error(`Failed to fetch timestream data with '${unwrapError(err)}'`);
    return {
      airTemp: null,
      groundTemp: null,
    };
  }
};
