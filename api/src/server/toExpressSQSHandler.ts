import express from 'express';
import mockSQSEvent from './mockSQSEvent';
import mockLambdaContext from './mockLambdaContext';
import { unwrapError } from '../utilities';

export default (fn: AWSLambda.SQSHandler): express.RequestHandler => {
  return async (req, res) => {
    try {
      await fn(
        mockSQSEvent(JSON.parse(req.body)),
        mockLambdaContext(),
        () => {},
      );
      res.send('OK');
    } catch (err) {
      console.error(err);
      res.status(500);
      res.send(unwrapError(err));
    }
  };
};
