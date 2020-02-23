import { fail } from './responses';

export default (
  fn: AWSLambda.APIGatewayProxyHandler
): AWSLambda.APIGatewayProxyHandler => (event, context, callback) => {
  const returnVal = fn(event, context, callback);

  if (returnVal) {
    return returnVal.catch(err => fail(err));
  }

  return returnVal;
};
