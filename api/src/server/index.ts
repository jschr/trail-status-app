import { env } from '@trail-status-app/utilities';
import bodyParser from 'body-parser';
import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import getTrailStatus from '../handlers/getTrailStatus';
import updateTrailStatus from '../handlers/updateTrailStatus';
import authorizeFacebook from '../handlers/authorizeFacebook';
import authorizeFacebookCallback from '../handlers/authorizeFacebookCallback';
import authorizeTwitter from '../handlers/authorizeTwitter';
import authorizeTwitterCallback from '../handlers/authorizeTwitterCallback';
import authorizeInstagram from '../handlers/authorizeInstagram';
import authorizeInstagramCallback from '../handlers/authorizeInstagramCallback';
import syncTrailStatus from '../handlers/syncTrailStatus';
import toExpressHandler from './toExpressHandler';

const app = express();
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, '../../../localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../../../localhost.pem'))
  },
  app
);

app.get('/status', toExpressHandler(getTrailStatus));
app.put(
  '/status',
  bodyParser.text({ type: 'application/json' }),
  toExpressHandler(updateTrailStatus)
);
app.post('/status/sync', toExpressHandler(syncTrailStatus));

app.get('/twitter/authorize', toExpressHandler(authorizeTwitter));
app.get(
  '/twitter/authorize/callback',
  toExpressHandler(authorizeTwitterCallback)
);

app.get('/facebook/authorize', toExpressHandler(authorizeFacebook));
app.get(
  '/facebook/authorize/callback',
  toExpressHandler(authorizeFacebookCallback)
);

app.get('/instagram/authorize', toExpressHandler(authorizeInstagram));
app.get(
  '/instagram/authorize/callback',
  toExpressHandler(authorizeInstagramCallback)
);

const port = env('API_PORT');
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
