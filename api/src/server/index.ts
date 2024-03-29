import { env } from '@trail-status-app/utilities';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import https from 'https';
import getRegionStatus from '../handlers/getRegionStatus';
import getRegionHistory from '../handlers/getRegionHistory';
import getTrailStatus from '../handlers/getTrailStatus';
import getLegacyTrailStatus from '../handlers/getLegacyTrailStatus';
import authorizeInstagram from '../handlers/authorizeInstagram';
import authorizeInstagramCallback from '../handlers/authorizeInstagramCallback';
import putTrail from '../handlers/putTrail';
import postTrail from '../handlers/postTrail';
import deleteTrail from '../handlers/deleteTrail';
import getRegion from '../handlers/getRegion';
import putRegion from '../handlers/putRegion';
import postWebhook from '../handlers/postWebhook';
import postWebhookRun from '../handlers/postWebhookRun';
import putWebhook from '../handlers/putWebhook';
import deleteWebhook from '../handlers/deleteWebhook';
import runSyncUsers from '../handlers/runSyncUsers';
import runWebhooks from '../handlers/runWebhooks';
import testWebhook from '../handlers/testWebhook';
import postFCMWebhook from '../handlers/postFCMWebhook';
import postFCMSubscribe from '../handlers/postFCMSubscribe';
import postFCMUnsubscribe from '../handlers/postFCMUnsubscribe';
import scheduleSyncUsers from '../handlers/scheduleSyncUsers';
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

app.get('/regions', toExpressApiHandler(getRegion));
app.put('/regions', toExpressApiHandler(putRegion));
app.get('/regions/status', toExpressApiHandler(getRegionStatus));
app.get('/regions/history', toExpressApiHandler(getRegionHistory));

app.post('/trails', toExpressApiHandler(postTrail));
app.put('/trails', toExpressApiHandler(putTrail));
app.delete('/trails', toExpressApiHandler(deleteTrail));
app.post('/trails/status', toExpressApiHandler(getTrailStatus));

app.post('/webhooks', toExpressApiHandler(postWebhook));
app.put('/webhooks', toExpressApiHandler(putWebhook));
app.delete('/webhooks', toExpressApiHandler(deleteWebhook));
app.post('/webhooks/run', toExpressApiHandler(postWebhookRun));

// TODO: Deprecate
app.get('/status', toExpressApiHandler(getLegacyTrailStatus));

app.post('/schedule-sync-user', toExpressScheduledHandler(scheduleSyncUsers));

// Example body:
// {
//   "Records": [
//       {
//           "groupId": "[userId]",
//           "messageId": "[userId]",
//           "body": "{\"userId\": \"[userId]\"}"
//       }
//   ]
// }
app.post('/run-sync-users', toExpressSQSHandler(runSyncUsers));

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

app.get('/webhook-test', toExpressApiHandler(testWebhook));
app.post('/webhook-test', toExpressApiHandler(testWebhook));

app.post('/webhook-fcm', toExpressApiHandler(postFCMWebhook));
app.post('/fcm-subscribe', toExpressApiHandler(postFCMSubscribe));
app.post('/fcm-unsubscribe', toExpressApiHandler(postFCMUnsubscribe));

const port = env('API_PORT');
server.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `> API started on ${env('API_ENDPOINT')}`);
  console.log();
});
