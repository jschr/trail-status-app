import * as SQS from '@aws-sdk/client-sqs';
import UserModel from '../models/UserModel';
import withScheduledHandler from '../withScheduledHandler';
import { unwrapError } from '../utilities';

const sqs = new SQS.SQS();
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
  const params: SQS.SendMessageRequest = {
    MessageGroupId: user.id,
    MessageDeduplicationId: user.id,
    MessageBody: JSON.stringify({ userId: user.id }),
    QueueUrl: runSyncUsersQueueUrl,
  };
  try {
    await sqs.sendMessage(params);
    console.info(`Created sync user job for user '${user.id}''`);
  } catch (err) {
    throw new Error(
      `Failed to create sync user job for user '${user.id}' with '${unwrapError(
        err,
      )}'`,
    );
  }
};
