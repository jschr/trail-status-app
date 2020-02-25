import * as instagram from '../clients/instagram';
import { redirect } from '../responses';
import withApiHandler from '../withApiHandler';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  const { authorizeUrl, state } = await instagram.getAuthorizeUrl();

  const trailAuthSession = new TrailAuthSessionModel({
    sessionId: `instagram|${state}`,
    trailId: 'hydrocut'
  });
  await trailAuthSession.save();

  return redirect(authorizeUrl);
};

export default withApiHandler(handler);
