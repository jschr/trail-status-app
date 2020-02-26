import TrailStatusModel from '../models/TrailStatusModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  const trailStatus = await TrailStatusModel.get('hydrocut');
  return json(trailStatus);
};

export default withApiHandler([], handler);
