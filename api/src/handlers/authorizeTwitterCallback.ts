import { assert } from '@trail-status-app/utilities';
import * as twitter from '../clients/twitter';
import { parseQuery } from '../requests';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import TrailAuthModel from '../models/TrailAuthModel';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

interface AuthorizeTwitterCallback {
  oauth_token: string;
  oauth_verifier: string;
}

const assertAuthorizeTwitterCallback = (
  query: any
): AuthorizeTwitterCallback => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.')
  );

  assert(
    typeof query.oauth_token !== 'string',
    new BadRequestError('Invalid oauth_token provided in query.')
  );

  assert(
    typeof query.oauth_verifier !== 'string',
    new BadRequestError('Invalid oauth_verifier provided in query.')
  );

  return query as AuthorizeTwitterCallback;
};

const handler: AWSLambda.APIGatewayProxyHandler = async event => {
  const {
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier
  } = assertAuthorizeTwitterCallback(parseQuery(event));

  const { accessToken, accessTokenSecret } = await twitter.getAccessToken(
    oauthToken,
    oauthVerifier
  );

  const trailSessionAuth = await TrailAuthSessionModel.get(
    `twitter|${oauthToken}`
  );
  if (!trailSessionAuth)
    throw new NotFoundError('Trail auth session not found.');

  const trailAuth = new TrailAuthModel({
    trailAuthId: `twitter|${trailSessionAuth.trailId}`,
    sessionId: trailSessionAuth.sessionId,
    accessToken,
    accessTokenSecret
  });
  await trailAuth.save();

  return json(trailAuth);
};

export default withApiHandler(handler);
