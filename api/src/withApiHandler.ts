import { fail } from './responses';
import * as jwt from './jwt';
import { UnauthorizedError } from './HttpError';

export interface ApiEvent extends AWSLambda.APIGatewayEvent {
  decodedToken: jwt.DecodedToken;
}

export type ApiHandler = AWSLambda.Handler<
  ApiEvent,
  AWSLambda.APIGatewayProxyResult
>;

export default (
  scopes: jwt.Permissions[],
  fn: ApiHandler,
): AWSLambda.Handler => (
  event: AWSLambda.APIGatewayEvent,
  context,
  callback,
) => {
  if (scopes.length > 0) {
    const authHeader = event.headers.Authorization || '';
    const [, token] = authHeader.split(' ');

    try {
      const decodedToken = jwt.verify(token);

      const hasPermission = scopes.every(scope =>
        decodedToken.permissions.some(perm => perm === scope),
      );

      if (!hasPermission) {
        throw new Error('Missing permission');
      }

      (event as ApiEvent).decodedToken = decodedToken;
    } catch (err) {
      return Promise.resolve(
        fail(new UnauthorizedError('Invalid or missing JWT', err)),
      );
    }
  }

  const returnVal = fn(event as ApiEvent, context, callback);

  if (returnVal) {
    return returnVal.catch(err => fail(err));
  }

  return returnVal;
};
