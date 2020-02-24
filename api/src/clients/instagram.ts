// import fetch from 'node-fetch';
import uuid from 'uuid/v4';
import { env } from '@trail-status-app/utilities';

const igLoginUrl = 'https://api.instagram.com';
const igAppId = env('INSTAGRAM_APP_ID');

export const getAuthorizeUrl = (): {
  authorizeUrl: string;
  state: string;
} => {
  const state = uuid();

  //https://api.instagram.com/oauth/authorize?client_id={app-id}&redirect_uri={redirect-uri}&scope=user_profile,user_media&response_type=code
  const authorizeUrl = `${igLoginUrl}/oauth/authorize?client_id=${igAppId}&redirect_uri=${fbRedirectUri}&state=${state}&scope=${fbScopes}&auth_type=reauthenticate`;

  return { authorizeUrl, state };
};
