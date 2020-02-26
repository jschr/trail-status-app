import { fail } from './responses';
import * as jwt from './jwt';
import { UnauthorizedError } from './HttpError';

interface WithApiEvent extends AWSLambda.APIGatewayEvent {
  decodedToken?: jwt.DecodedToken;
}

type WithApiHandler = AWSLambda.Handler<
  WithApiEvent,
  AWSLambda.APIGatewayProxyResult
>;

export default (
  scopes: jwt.Permissions[],
  fn: WithApiHandler
): AWSLambda.APIGatewayProxyHandler => (
  event: WithApiEvent,
  context,
  callback
) => {
  if (scopes.length > 0) {
    const authHeader = event.headers.authorization || '';
    const [_, token] = authHeader.split(' ');

    try {
      const decodedToken = jwt.verify(token);

      const hasPermission = scopes.every(scope =>
        decodedToken.permissions.some(perm => perm === scope)
      );

      if (!hasPermission) {
        throw new Error('Missing permission');
      }

      event.decodedToken = decodedToken;
    } catch (err) {
      return Promise.resolve(
        fail(new UnauthorizedError('Invalid or missing JWT', err))
      );
    }
  }

  const returnVal = fn(event, context, callback);

  if (returnVal) {
    return returnVal.catch(err => fail(err));
  }

  return returnVal;
};
