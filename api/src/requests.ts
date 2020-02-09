import { BadRequestError } from './HttpError';

export const parseBody = (event: AWSLambda.APIGatewayEvent) => {
  try {
    return JSON.parse(event.body || '{}');
  } catch (err) {
    throw new BadRequestError(err.message);
  }
};

export const parseQuery = (event: AWSLambda.APIGatewayEvent) => {
  try {
    return event.queryStringParameters;
  } catch (err) {
    throw new BadRequestError(err.message);
  }
};
