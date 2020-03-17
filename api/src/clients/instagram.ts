import fetch from 'node-fetch';
import uuid from 'uuid/v4';
import { env } from '@trail-status-app/utilities';
import { URLSearchParams } from 'url';

const igApiUrl = 'https://api.instagram.com';
const igGraphUrl = 'https://graph.instagram.com';
const igAppId = env('INSTAGRAM_APP_ID');
const igAppSecret = env('INSTAGRAM_APP_SECRET');
const igRedirectUri = `${env('API_ENDPOINT')}/instagram/authorize/callback`;
const igScopes = 'user_profile,user_media';

export const getAuthorizeUrl = (): {
  authorizeUrl: string;
  state: string;
} => {
  const state = uuid();
  const authorizeUrl = `${igApiUrl}/oauth/authorize?client_id=${igAppId}&redirect_uri=${igRedirectUri}&state=${state}&scope=${igScopes}&auth_type=reauthenticate&response_type=code`;
  return { authorizeUrl, state };
};

export const handleRedirectCallback = async (
  code: string,
): Promise<{ userId: number; accessToken: string; expiresIn: number }> => {
  const shortLivedAccessTokenUrl = `${igApiUrl}/oauth/access_token`;
  const shortLivedAccessTokenParams = new URLSearchParams();
  shortLivedAccessTokenParams.append('grant_type', 'authorization_code');
  shortLivedAccessTokenParams.append('client_id', igAppId);
  shortLivedAccessTokenParams.append('client_secret', igAppSecret);
  shortLivedAccessTokenParams.append('redirect_uri', igRedirectUri);
  shortLivedAccessTokenParams.append('code', code);

  const shortLivedAccessTokenResp = await fetch(shortLivedAccessTokenUrl, {
    method: 'POST',
    body: shortLivedAccessTokenParams,
  });
  if (!shortLivedAccessTokenResp.ok) {
    const payload = await shortLivedAccessTokenResp.text();
    throw new Error(
      `InstagramClient error getting short lived access token: ${payload}`,
    );
  }

  const shortLivedAccessTokenPayload = await shortLivedAccessTokenResp.json();

  const longLivedAccessTokenUrl = `${igGraphUrl}/access_token?grant_type=ig_exchange_token&client_secret=${igAppSecret}&access_token=${shortLivedAccessTokenPayload.access_token}`;
  const longLivedAccessTokenResp = await fetch(longLivedAccessTokenUrl);
  if (!longLivedAccessTokenResp.ok) {
    const payload = await longLivedAccessTokenResp.text();
    throw new Error(
      `InstagramClient error getting long lived access token: ${payload}`,
    );
  }

  const longLivedAccesTokenPayload = await longLivedAccessTokenResp.json();

  return {
    userId: shortLivedAccessTokenPayload.user_id,
    accessToken: longLivedAccesTokenPayload.access_token,
    expiresIn: longLivedAccesTokenPayload.expires_in,
  };
};

interface User {
  id: string;
  username: string;
}

export const getUser = async (accessToken: string): Promise<User> => {
  const userUrl = `${igGraphUrl}/me?fields=id,username&access_token=${accessToken}`;
  const userResp = await fetch(userUrl);

  if (!userResp.ok) {
    const payload = await userResp.text();
    throw new Error(`InstagramClient error getting user: ${payload}`);
  }

  const userPayload = await userResp.json();
  if (!userPayload || typeof userPayload !== 'object')
    throw new Error(`InstagramClient error getting user: Invalid user payload`);
  if (typeof userPayload.username !== 'string')
    throw new Error(`InstagramClient error getting user: Invalid username`);

  return userPayload;
};

interface UserMedia {
  id: string;
  caption: string;
  mediaUrl: string;
}

export const getUserMedia = async (
  accessToken: string,
): Promise<UserMedia[]> => {
  const userUrl = `${igGraphUrl}/me?fields=media,media.caption,media.media_url&access_token=${accessToken}`;
  const userResp = await fetch(userUrl);

  if (!userResp.ok) {
    const payload = await userResp.text();
    throw new Error(`InstagramClient error getting user: ${payload}`);
  }

  const userPayload = await userResp.json();
  const userMedia = userPayload?.media?.data ?? [];

  return userMedia.map((m: any) => ({
    id: m.id,
    caption: m.caption,
    mediaUrl: m.media_url,
  }));
};

export const refreshAccessToken = async (
  accessToken: string,
): Promise<{ accessToken: string; expiresIn: number }> => {
  const refreshTokenUrl = `${igGraphUrl}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`;
  const refreshTokenResp = await fetch(refreshTokenUrl);

  if (!refreshTokenResp.ok) {
    const payload = await refreshTokenResp.text();
    throw new Error(
      `InstagramClient error refreshing access token: ${payload}`,
    );
  }

  const refreshTokenPayload = await refreshTokenResp.json();

  return {
    accessToken: refreshTokenPayload?.access_token ?? '',
    expiresIn: refreshTokenPayload?.expires_in ?? 0,
  };
};
