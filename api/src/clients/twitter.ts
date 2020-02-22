import oauth from 'oauth';
import util from 'util';
import { env } from '@trail-status-app/utilities';


const client = new oauth.OAuth(
  'https://twitter.com/oauth/request_token',
  'https://twitter.com/oauth/access_token',
  env('TWITTER_CONSUMER_KEY'),
  env('TWITTER_CONSUMER_SECRET'),
  '1.0A',
  `${env('API_ENDPOINT')}/twitter/authorize/callback`,
  'HMAC-SHA1'
);

export const getAuthorizeUrl = (): Promise<{
  authorizeUrl: string;
  oauthToken: string;
}> => {
  return new Promise((resolve, reject) => {
    client.getOAuthRequestToken((err, oauthToken) => {
      if (err) {
        return reject(
          new Error(
            `TwitterClient error getting OAuth request token: ${util.inspect(
              err
            )}`
          )
        );
      }

      resolve({
        authorizeUrl: `https://twitter.com/oauth/authorize?oauth_token=${oauthToken}`,
        oauthToken
      });
    });
  });
};

export const getAccessToken = (
  oauthToken: string,
  oauthVerifier: string
): Promise<{ accessToken: string; accessTokenSecret: string }> => {
  return new Promise((resolve, reject) => {
    client.getOAuthAccessToken(
      oauthToken,
      '', // Twitter API doesn't require that you pass oauthTokenSecret.
      oauthVerifier,
      (err, accessToken, accessTokenSecret) => {
        if (err) {
          return reject(
            new Error(
              `TwitterClient error getting access token: ${util.inspect(err)}`
            )
          );
        }

        resolve({ accessToken, accessTokenSecret });
      }
    );
  });
};
