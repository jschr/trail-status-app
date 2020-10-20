import express from 'express';
import mockScheduledEvent from './mockScheduledEvent';
import mockLambdaContext from './mockLambdaContext';

export default (fn: AWSLambda.ScheduledHandler): express.RequestHandler => {
  return async (_, res) => {
    try {
      await fn(mockScheduledEvent(), mockLambdaContext(), () => {});
      res.send('OK');
    } catch (err) {
      console.error(err);
      res.status(500);
      res.send(err.message);
    }
  };
};
