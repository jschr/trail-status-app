// import * as facebook from '../clients/facebook';
import TrailAuthModel from '../models/TrailAuthModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  const trailAuth = await TrailAuthModel.get('facebook|hydrocut');
  return json(trailAuth);
};

export default withApiHandler(handler);
