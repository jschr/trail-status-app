import bodyParser from 'body-parser';
import express from 'express';
import getTrailStatus from '../functions/getTrailStatus';
import updateTrailStatus from '../functions/updateTrailStatus';
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

server.listen(4000, () => {
  console.log('\x1b[36m%s\x1b[0m', '> API started on http://localhost:4000');
  console.log();
});
