import { isHttpError, InternalServerError } from './HttpError';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*'
};

export const json = (body: any): AWSLambda.APIGatewayProxyResult => ({
  statusCode: 200,
  body: JSON.stringify(body),
  headers
});

export const redirect = (
  location: string
): AWSLambda.APIGatewayProxyResult => ({
  statusCode: 302,
  headers: { Location: location },
  body: ''
});

export const fail = <E extends Error>(
  err: E
): AWSLambda.APIGatewayProxyResult => {
  const httpError = isHttpError(err) ? err : new InternalServerError(err);

  if (httpError.originalError) {
    console.error(httpError.originalError);
  }

  return {
    statusCode: httpError.statusCode,
    body: JSON.stringify({ message: httpError.message }),
    headers
  };
};
