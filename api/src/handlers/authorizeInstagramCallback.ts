import { assert } from '@trail-status-app/utilities';
import * as instagram from '../clients/instagram';
import { parseQuery } from '../requests';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import TrailAuthModel from '../models/TrailAuthModel';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

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
  const { code, state } = assertAuthorizeInstagramCallback(parseQuery(event));

  const { accessToken } = await instagram.getAccessToken(code).catch(err => {
    throw new BadRequestError('Failed getting access token.', err);
  });

  const trailSessionAuth = await TrailAuthSessionModel.get(
    `instagram|${state}`
  );
  if (!trailSessionAuth)
    throw new NotFoundError('Trail auth session not found.');

  const trailAuth = new TrailAuthModel({
    trailAuthId: `instagram|${trailSessionAuth.trailId}`,
    sessionId: trailSessionAuth.sessionId,
    accessToken
  });

  await trailAuth.save();

  return json(trailAuth);
};

export default withApiHandler(handler);
