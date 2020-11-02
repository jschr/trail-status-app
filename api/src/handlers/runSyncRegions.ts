import withSQSHandler from '../withSQSHandler';
import RegionModel from '../models/RegionModel';
import UserModel from '../models/UserModel';
import TrailModel from '../models/TrailModel';
import * as instagram from '../clients/instagram';

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
  const userMedia = await instagram.getUserMedia(accessToken);

  console.log('userMedia', userMedia);
  console.log('trails', trails);
  console.log('region', region);
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
