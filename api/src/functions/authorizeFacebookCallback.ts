import { assert } from '@hydrocut-trail-status/utilities';
import * as facebook from '../clients/facebook';
import { parseQuery } from '../requests';
import { success, fail } from '../responses';
import { BadRequestError, NotFoundError } from '../HttpError';
import TrailAuthModel from '../models/TrailAuthModel';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

interface AuthorizeFacebookCallback {
  code: string;
  state: string;
}

const assertAuthorizeFacebookCallback = (
  query: any
): AuthorizeFacebookCallback => {
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

  return query as AuthorizeFacebookCallback;
};

const handler: AWSLambda.APIGatewayProxyHandler = async event => {
  try {
    const { code, state } = assertAuthorizeFacebookCallback(parseQuery(event));

    const { accessToken } = await facebook.getAccessToken(code);

    const trailSessionAuth = await TrailAuthSessionModel.get(
      `facebook|${state}`
    );
    if (!trailSessionAuth)
      throw new NotFoundError('Trail auth session not found.');

    const trailAuth = new TrailAuthModel({
      trailAuthId: `facebook|${trailSessionAuth.trailId}`,
      sessionId: trailSessionAuth.sessionId,
      accessToken
    });
    await trailAuth.save();

    return success(trailAuth);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
