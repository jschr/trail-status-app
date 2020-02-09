import express from 'express';
import mockApiGatewayEvent from './mockApiGatewayEvent';
import mockLambdaContext from './mockLambdaContext';

export default (
  fn: AWSLambda.APIGatewayProxyHandler
): express.RequestHandler => {
  return async (req, res) => {
    try {
      const result = await fn(
        mockApiGatewayEvent({
          queryStringParameters: req.query,
          body: req.body && String(req.body)
        }),
        mockLambdaContext(),
        () => {}
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
