import express from 'express';
import mockApiGatewayEvent from './mockApiGatewayEvent';
import mockLambdaContext from './mockLambdaContext';

export default (
  fn: AWSLambda.APIGatewayProxyHandler,
): express.RequestHandler => {
  return async (req, res) => {
    try {
      const requestHeaders: { [key: string]: string } = {};
      if (req.headers) {
        for (const [header, value] of Object.entries(req.headers)) {
          requestHeaders[header] = String(value);
        }
      }

      // Express coverts headers to lowercase but APIG doesn't.
      // TODO: Figure out how to turn off the auto lowercase or switch from Express
      requestHeaders.Authorization = requestHeaders.authorization;

      const result = await fn(
        mockApiGatewayEvent({
          queryStringParameters: req.query,
          body: req.body && String(req.body),
          headers: requestHeaders,
        }),
        mockLambdaContext(),
        () => {},
      );

      if (result) {
        res.status(result.statusCode);
        if (result.headers) {
          for (const [header, value] of Object.entries(result.headers)) {
            res.setHeader(header, String(value));
          }
        }
        res.send(result.body);
      }
    } catch (err) {
      res.status(500);
      res.send(err.message);
    }
  };
};
