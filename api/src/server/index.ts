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
import syncRegion from '../handlers/syncRegion';
import getTrailSettings from '../handlers/getTrailSettings';
import putTrailSettings from '../handlers/putTrailSettings';
import runTrailWebhooks from '../handlers/runTrailWebhooks';
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

app.post('/schedule-sync-regions', toExpressScheduledHandler(syncRegion));

// Example body:
// {
//   "Records": [
//       {
//           "groupId": "[userId]>",
//           "messageId": "[regionId]",
//           "body": "{\"regionId\": \"[regionId]\"}"
//       }
//   ]
// }
app.post('/run-sync-region', toExpressSQSHandler(runTrailWebhooks));

// Example body:
// {
//   "Records": [
//       {
//           "groupId": "[trailId]",
//           "messageId": "[webhookId]",
//           "body": "{\"webhookId\": \"[webhookId]\"}"
//       }
//   ]
// }
app.post('/run-trail-webhooks', toExpressSQSHandler(runTrailWebhooks));

const port = env('API_PORT');
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
