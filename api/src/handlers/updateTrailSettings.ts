// import TrailSettingsModel from '../models/TrailSettingsModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';

const handler: AWSLambda.APIGatewayProxyHandler = async event => {
  // const trailSettings = await TrailSettingsModel.get('hydrocut');
  return json(event);
};

export default withApiHandler([], handler);
