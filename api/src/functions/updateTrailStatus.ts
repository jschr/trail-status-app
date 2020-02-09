import { success, fail } from '@hydrocut-trail-status/utilities';
import TrailStatusModel from '../models/TrailStatusModel';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    let trailStatus = await TrailStatusModel.get('hydrocut');
    if (!trailStatus) {
      trailStatus = new TrailStatusModel({ trailId: 'hydrocut' });
    }

    await trailStatus.save({ status: 'open' });

    return success(trailStatus);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
