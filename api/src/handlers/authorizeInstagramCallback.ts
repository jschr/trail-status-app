import { assert, env } from '@trail-status-app/utilities';
import uuid from 'uuid/v4';
import * as instagram from '../clients/instagram';
import { parseQuery } from '../requests';
import { redirect } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError } from '../HttpError';
import UserModel from '../models/UserModel';
import RegionModel from '../models/RegionModel';
import * as jwt from '../jwt';

interface AuthorizeInstagramCallback {
  code: string;
  state: string;
}

const isNotNull = <T>(value: T | null): value is T => {
  return value !== null;
};

export default withApiHandler([], async event => {
  const { code } = assertAuthorizeInstagramCallback(parseQuery(event));

  const {
    userId: igUserId,
    accessToken,
    expiresIn,
  } = await instagram.handleRedirectCallback(code).catch(err => {
    throw new BadRequestError('Failed getting access token.', err);
  });

  const { username } = await instagram.getUser(accessToken);

  const userId = `instagram|${igUserId}`;
  let user = await UserModel.get(userId);
  if (!user) {
    user = new UserModel({
      id: userId,
      createdAt: new Date().toISOString(),
    });
  }

  // Update user with latest Instagram user data.
  const now = new Date();
  const expiresAt = new Date(+now + expiresIn * 1000);
  await user.save({
    username,
    accessToken,
    expiresAt: expiresAt.toISOString(),
    lastLoginAt: now.toISOString(),
  });

  // Ensure user has at least one region.
  const regions = await RegionModel.allByUser(userId);
  if (regions.length === 0) {
    const region = new RegionModel({
      id: uuid(),
      userId,
      name: `${username}'s Region`,
      openHashtag: 'trailsopen',
      closeHashtag: 'trailsclosed',
      createdAt: new Date().toISOString(),
    });
    await region.save();
    regions.push(region);
  }

  const sharedRegions = await RegionModel.batchGet(
    user.sharedRegions.map(id => ({ id })),
  );

  const sessionToken = jwt.createUserSession(userId, username, [
    ...regions,
    ...sharedRegions.filter(isNotNull),
  ]);

  return redirect(`${env('FRONTEND_ENDPOINT')}?sessionToken=${sessionToken}`);
});

const assertAuthorizeInstagramCallback = (
  query: any,
): AuthorizeInstagramCallback => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.code !== 'string',
    new BadRequestError('Invalid code provided in query.'),
  );

  assert(
    typeof query.state !== 'string',
    new BadRequestError('Invalid state provided in query.'),
  );

  return query as AuthorizeInstagramCallback;
};
