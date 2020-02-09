import { success, fail } from '@hydrocut-trail-status/utilities';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    return success('OK');
  } catch (err) {
    return fail(err);
  }
};

export default handler;
