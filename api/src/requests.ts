import { BadRequestError } from './HttpError';
import { unwrapError } from './utilities';

export const parseBody = (event: AWSLambda.APIGatewayEvent) => {
  try {
    return JSON.parse(event.body || '{}');
  } catch (err) {
    throw new BadRequestError(unwrapError(err));
  }
};

export const parseQuery = (event: AWSLambda.APIGatewayEvent) => {
  try {
    return event.queryStringParameters;
  } catch (err) {
    throw new BadRequestError(unwrapError(err));
  }
};
