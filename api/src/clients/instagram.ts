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
  code: string
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
    body: shortLivedAccessTokenParams
  });
  if (!shortLivedAccessTokenResp.ok) {
    const payload = await shortLivedAccessTokenResp.text();
    throw new Error(
      `InstagramClient error getting short lived access token: ${payload}`
    );
  }

  const shortLivedAccessTokenPayload = await shortLivedAccessTokenResp.json();

  const longLivedAccessTokenUrl = `${igGraphUrl}/access_token?grant_type=ig_exchange_token&client_secret=${igAppSecret}&access_token=${shortLivedAccessTokenPayload.access_token}`;
  const longLivedAccessTokenResp = await fetch(longLivedAccessTokenUrl);
  if (!longLivedAccessTokenResp.ok) {
    const payload = await longLivedAccessTokenResp.text();
    throw new Error(
      `InstagramClient error getting long lived access token: ${payload}`
    );
  }

  const longLivedAccesTokenPayload = await longLivedAccessTokenResp.json();

  return {
    userId: shortLivedAccessTokenPayload.user_id,
    accessToken: longLivedAccesTokenPayload.access_token,
    expiresIn: longLivedAccesTokenPayload.expires_in
  };
};
