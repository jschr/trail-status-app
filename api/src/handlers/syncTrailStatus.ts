import { json } from '../responses';
import withApiHandler from '../withApiHandler';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  return json(true);
};

export default withApiHandler(handler);
