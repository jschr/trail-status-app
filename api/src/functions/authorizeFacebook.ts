import * as facebook from '../clients/facebook';
import { redirect } from '../responses';
import withApiHandler from '../withApiHandler';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  const { authorizeUrl, state } = await facebook.getAuthorizeUrl();

  const trailAuthSession = new TrailAuthSessionModel({
    sessionId: `facebook|${state}`,
    trailId: 'hydrocut'
  });
  await trailAuthSession.save();

  return redirect(authorizeUrl);
};

export default withApiHandler(handler);
