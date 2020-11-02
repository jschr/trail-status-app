import * as AWS from 'aws-sdk';
import RegionModel from '../models/RegionModel';
import withScheduledHandler from '../withScheduledHandler';

const sqs = new AWS.SQS();
const runSyncRegionsQueueUrl = process.env.RUN_SYNC_REGIONS_QUEUE_URL;

if (!runSyncRegionsQueueUrl) {
  throw new Error(`Missing environment variable 'RUN_SYNC_REGIONS_QUEUE_URL'`);
}

export default withScheduledHandler(async () => {
  const regions = await RegionModel.all();
  await regions.map(createSyncRegionJob);
});

const createSyncRegionJob = async (region: RegionModel) => {
  const params: AWS.SQS.SendMessageRequest = {
    MessageGroupId: region.userId,
    MessageDeduplicationId: region.id,
    MessageBody: JSON.stringify({ regionId: region.id }),
    QueueUrl: runSyncRegionsQueueUrl,
  };
  try {
    await sqs.sendMessage(params).promise();
    console.info(`Created sync region job for '${region.id}'`);
  } catch (err) {
    throw new Error(
      `Failed to create sync region job for '${region.id}' with '${err.message}'`,
    );
  }
};
