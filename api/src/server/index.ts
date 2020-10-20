import { env } from '@trail-status-app/utilities';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import https from 'https';
import getTrailStatus from '../handlers/getTrailStatus';
import authorizeInstagram from '../handlers/authorizeInstagram';
import authorizeInstagramCallback from '../handlers/authorizeInstagramCallback';
import syncTrailStatus from '../handlers/syncTrailStatus';
import getTrailSettings from '../handlers/getTrailSettings';
import putTrailSettings from '../handlers/putTrailSettings';
import receiveWebhookJob from '../handlers/receiveWebhookJob';
import toExpressApiHandler from './toExpressApiHandler';
import toExpressScheduledHandler from './toExpressScheduledHandler';
import toExpressSQSHandler from './toExpressSQSHandler';

const app = express();
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, '../../../localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../../../localhost.pem')),
  },
  app,
);

app.use(cors());
app.use(bodyParser.text({ type: 'application/json' }));

app.get('/instagram/authorize', toExpressApiHandler(authorizeInstagram));
app.get(
  '/instagram/authorize/callback',
  toExpressApiHandler(authorizeInstagramCallback),
);

app.get('/status', toExpressApiHandler(getTrailStatus));

app.get('/settings', toExpressApiHandler(getTrailSettings));
app.put('/settings', toExpressApiHandler(putTrailSettings));

app.post('/sync-status', toExpressScheduledHandler(syncTrailStatus));

app.post('/receive-webhook-job', toExpressSQSHandler(receiveWebhookJob));

const port = env('API_PORT');
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
