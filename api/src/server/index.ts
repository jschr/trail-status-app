import { env } from '@trail-status-app/utilities';
import bodyParser from 'body-parser';
import express from 'express';
import getTrailStatus from '../functions/getTrailStatus';
import updateTrailStatus from '../functions/updateTrailStatus';
import authorizeFacebook from '../functions/authorizeFacebook';
import authorizeFacebookCallback from '../functions/authorizeFacebookCallback';
import authorizeTwitter from '../functions/authorizeTwitter';
import authorizeTwitterCallback from '../functions/authorizeTwitterCallback';
import toExpressHandler from './toExpressHandler';

const server = express();

server.get('/status', toExpressHandler(getTrailStatus));
server.put(
  '/status',
  bodyParser.text({ type: 'application/json' }),
  toExpressHandler(updateTrailStatus)
);

server.get('/twitter/authorize', toExpressHandler(authorizeTwitter));
server.get(
  '/twitter/authorize/callback',
  toExpressHandler(authorizeTwitterCallback)
);

server.get('/facebook/authorize', toExpressHandler(authorizeFacebook));
server.get(
  '/facebook/authorize/callback',
  toExpressHandler(authorizeFacebookCallback)
);

const port = env('API_PORT')
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
