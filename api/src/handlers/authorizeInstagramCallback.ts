import { assert, env } from '@trail-status-app/utilities';
import * as instagram from '../clients/instagram';
import { parseQuery } from '../requests';
import { redirect } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError } from '../HttpError';
import UserModel from '../models/UserModel';
import TrailSettingsModel from '../models/TrailSettingsModel';
import * as jwt from '../jwt';
import getDefaultTrailId from '../getDefaultTrailId';

interface AuthorizeInstagramCallback {
  code: string;
  state: string;
}

const assertAuthorizeInstagramCallback = (
  query: any
): AuthorizeInstagramCallback => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.')
  );

  assert(
    typeof query.code !== 'string',
    new BadRequestError('Invalid code provided in query.')
  );

  assert(
    typeof query.state !== 'string',
    new BadRequestError('Invalid state provided in query.')
  );

  return query as AuthorizeInstagramCallback;
};

const handler: AWSLambda.APIGatewayProxyHandler = async event => {
  const { code } = assertAuthorizeInstagramCallback(parseQuery(event));

  const {
    userId: igUserId,
    accessToken,
    expiresIn
  } = await instagram.handleRedirectCallback(code).catch(err => {
    throw new BadRequestError('Failed getting access token.', err);
  });

  const username = await instagram.getUsername(accessToken);
  const profilePictureUrl = await instagram.getProfilePictureUrl(username);

  const userId = `instagram|${igUserId}`;
  let user = await UserModel.get(userId);
  if (!user) {
    user = new UserModel({
      userId,
      createdAt: new Date().toISOString()
    });
  }

  const now = new Date();
  const expiresAt = new Date(+now + expiresIn * 1000);

  await user.save({
    accessToken,
    lastLoginAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  });

  // Create default trail settings.
  const defaultTrailId = getDefaultTrailId(userId);
  let defaultSettings = await TrailSettingsModel.get(defaultTrailId);
  if (!defaultSettings) {
    defaultSettings = new TrailSettingsModel({
      trailId: defaultTrailId,
      openHashtag: '#open-trails',
      closeHashtag: '#close-trails',
      createdAt: new Date().toISOString()
    });

    await defaultSettings.save();
  }

  const sessionToken = jwt.createUserSession(
    userId,
    username,
    profilePictureUrl
  );

  return redirect(`${env('FRONTEND_ENDPOINT')}?sessionToken=${sessionToken}`);
};

export default withApiHandler([], handler);
