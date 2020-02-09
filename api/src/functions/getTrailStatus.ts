import { success, fail } from '@hydrocut-trail-status/utilities';
import TrailStatusModel from '../models/TrailStatusModel';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    const trailStatus = await TrailStatusModel.get('hydrocut');
    return success(trailStatus);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
