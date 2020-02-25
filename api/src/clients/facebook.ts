import fetch from 'node-fetch';
import uuid from 'uuid/v4';
import { env } from '@trail-status-app/utilities';

const fbLoginUrl = 'https://www.facebook.com/v6.0';
const fbApiUrl = 'https://graph.facebook.com/v6.0';
const fbAppId = env('FACEBOOK_APP_ID');
const fbAppSecret = env('FACEBOOK_APP_SECRET');
const fbRedirectUri = `${env('API_ENDPOINT')}/facebook/authorize/callback`;
const fbScopes = 'public_profile,instagram_basic,manage_pages';

export const getAuthorizeUrl = (): {
  authorizeUrl: string;
  state: string;
} => {
  const state = uuid();
  const authorizeUrl = `${fbLoginUrl}/dialog/oauth?client_id=${fbAppId}&redirect_uri=${fbRedirectUri}&state=${state}&scope=${fbScopes}&auth_type=reauthenticate`;

  return { authorizeUrl, state };
};

export const getAccessToken = async (
  code: string
): Promise<{ accessToken: string }> => {
  const shortLivedAccessTokenUrl = `${fbApiUrl}/oauth/access_token?client_id=${fbAppId}&redirect_uri=${fbRedirectUri}&client_secret=${fbAppSecret}&code=${code}`;
  const shortLivedAccessTokenResp = await fetch(shortLivedAccessTokenUrl);
  if (!shortLivedAccessTokenResp.ok) {
    const payload = await shortLivedAccessTokenResp.text();
    throw new Error(
      `FacebookClient error getting short lived access token: ${payload}`
    );
  }

  const shortLivedAccessTokenPayload = await shortLivedAccessTokenResp.json();

  const longLivedAccessTokenUrl = `${fbApiUrl}/oauth/access_token?client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${shortLivedAccessTokenPayload.access_token}&grant_type=fb_exchange_token`;
  const longLivedAccessTokenResp = await fetch(longLivedAccessTokenUrl);
  if (!longLivedAccessTokenResp.ok) {
    const payload = await longLivedAccessTokenResp.text();
    throw new Error(
      `FacebookClient error getting long lived access token: ${payload}`
    );
  }

  const longLivedAccesTokenPayload = await longLivedAccessTokenResp.json();

  const getUserUrl = `${fbApiUrl}/me?fields=id`;
  const getUserUrlResp = await fetch(getUserUrl, {
    headers: {
      Authorization: `Bearer ${longLivedAccesTokenPayload.access_token}`
    }
  });
  if (!longLivedAccessTokenResp.ok) {
    const payload = await longLivedAccessTokenResp.text();
    throw new Error(`FacebookClient error getting user: ${payload}`);
  }

  const getUserPayload = await getUserUrlResp.json();

  const pageAccessTokenUrl = `${fbApiUrl}/${getUserPayload.id}/accounts?access_token=${longLivedAccesTokenPayload.access_token}`;
  const pageAccessTokenResp = await fetch(pageAccessTokenUrl);
  if (!pageAccessTokenResp.ok) {
    const payload = await pageAccessTokenResp.text();
    throw new Error(
      `FacebookClient error getting page access token: ${payload}`
    );
  }

  const pageAccesTokenPayload = await pageAccessTokenResp.json();
  const pageAccessToken = pageAccesTokenPayload.data[0].access_token;

  return { accessToken: pageAccessToken };
};
