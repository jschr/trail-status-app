import * as AWS from 'aws-sdk';
import UserModel from '../models/UserModel';
import withScheduledHandler from '../withScheduledHandler';

const sqs = new AWS.SQS();
const runSyncUsersQueueUrl = process.env.RUN_SYNC_USERS_QUEUE_URL;

if (!runSyncUsersQueueUrl) {
  throw new Error(`Missing environment variable 'RUN_SYNC_USERS_QUEUE_URL'`);
}

export default withScheduledHandler(async () => {
  const users = await UserModel.all();
  console.info(`Found '${users.length}' users to sync`);
  await Promise.all(users.map(createSyncUserJob));
});

const createSyncUserJob = async (user: UserModel) => {
  const params: AWS.SQS.SendMessageRequest = {
    MessageGroupId: user.id,
    MessageDeduplicationId: user.id,
    MessageBody: JSON.stringify({ userId: user.id }),
    QueueUrl: runSyncUsersQueueUrl,
  };
  try {
    await sqs.sendMessage(params).promise();
    console.info(`Created sync user job for user '${user.id}''`);
  } catch (err) {
    throw new Error(
      `Failed to create sync user job for user '${user.id}' with '${err.message}'`,
    );
  }
};
