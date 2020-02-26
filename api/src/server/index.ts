import { env } from '@trail-status-app/utilities';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';
import getTrailStatus from '../handlers/getTrailStatus';
import authorizeInstagram from '../handlers/authorizeInstagram';
import authorizeInstagramCallback from '../handlers/authorizeInstagramCallback';
import syncTrailStatus from '../handlers/syncTrailStatus';
import getTrailSettings from '../handlers/getTrailSettings';
import updateTrailSettings from '../handlers/updateTrailSettings';
import toExpressHandler from './toExpressHandler';

const app = express();
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, '../../../localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../../../localhost.pem'))
  },
  app
);

app.use(cors());

app.get('/instagram/authorize', toExpressHandler(authorizeInstagram));
app.get(
  '/instagram/authorize/callback',
  toExpressHandler(authorizeInstagramCallback)
);

app.get('/status', toExpressHandler(getTrailStatus));
app.post('/status/sync', toExpressHandler(syncTrailStatus));

app.get('/settings', toExpressHandler(getTrailSettings));
app.post('/settings', toExpressHandler(updateTrailSettings));

const port = env('API_PORT');
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
