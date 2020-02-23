import { env } from '@trail-status-app/utilities';
import bodyParser from 'body-parser';
import express from 'express';
import getTrailStatus from '../handlers/getTrailStatus';
import updateTrailStatus from '../handlers/updateTrailStatus';
import authorizeFacebook from '../handlers/authorizeFacebook';
import authorizeFacebookCallback from '../handlers/authorizeFacebookCallback';
import authorizeTwitter from '../handlers/authorizeTwitter';
import authorizeTwitterCallback from '../handlers/authorizeTwitterCallback';
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

const port = env('API_PORT');
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
