import * as twitter from '../clients/twitter';
import { parseQuery } from '../requests';
import { success, fail } from '../responses';
import { BadRequestError } from '../HttpError';
import { assert } from '@hydrocut-trail-status/utilities';

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
  try {
    const query = assertAuthorizeTwitterCallback(parseQuery(event));

    const { accessToken, accessTokenSecret } = await twitter.getAccessToken(
      query.oauth_token,
      query.oauth_verifier
    );

    // TODO: Lookup trail id for oauth_token, save access token and
    // secret for trail id in database.

    return success({ accessToken, accessTokenSecret });
  } catch (err) {
    return fail(err);
  }
};

export default handler;
