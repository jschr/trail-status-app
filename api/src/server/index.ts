import { env } from '@trail-status-app/utilities';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import https from 'https';
import getRegionStatus from '../handlers/getRegionStatus';
import getTrailStatus from '../handlers/getTrailStatus';
import getLegacyTrailStatus from '../handlers/getLegacyTrailStatus';
import authorizeInstagram from '../handlers/authorizeInstagram';
import authorizeInstagramCallback from '../handlers/authorizeInstagramCallback';
import putTrail from '../handlers/putTrail';
import postTrail from '../handlers/postTrail';
import getRegion from '../handlers/getRegion';
import putRegion from '../handlers/putRegion';
import runSyncRegions from '../handlers/runSyncRegions';
import runWebhooks from '../handlers/runWebhooks';
import scheduleSyncRegions from '../handlers/scheduleSyncRegions';
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

app.put('/trails', toExpressApiHandler(putTrail));
app.post('/trails', toExpressApiHandler(postTrail));
app.post('/trails/status', toExpressApiHandler(getTrailStatus));

app.get('/regions', toExpressApiHandler(getRegion));
app.put('/regions', toExpressApiHandler(putRegion));
app.get('/regions/status', toExpressApiHandler(getRegionStatus));

// TODO: Deprecate
app.get('/status', toExpressApiHandler(getLegacyTrailStatus));

app.post(
  '/schedule-sync-regions',
  toExpressScheduledHandler(scheduleSyncRegions),
);

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
app.post('/run-sync-regions', toExpressSQSHandler(runSyncRegions));

// Example body:
// {
//   "Records": [
//       {
//           "groupId": "[regionId]",
//           "messageId": "[webhookId]",
//           "body": "{\"webhookId\": \"[webhookId]\"}"
//       }
//   ]
// }
app.post('/run-webhooks', toExpressSQSHandler(runWebhooks));

const port = env('API_PORT');
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
