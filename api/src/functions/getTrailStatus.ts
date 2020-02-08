import { success, fail } from '../utilities/responses';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    // Return JSON, maybe a query param to return an image?
    return success('OK');
  } catch (err) {
    return fail(err);
  }
};

export default handler;
