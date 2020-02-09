import TrailStatusModel from '../models/TrailStatusModel';
import { success, fail } from '../responses';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    const trailStatus = await TrailStatusModel.get('hydrocut');
    return success(trailStatus);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
