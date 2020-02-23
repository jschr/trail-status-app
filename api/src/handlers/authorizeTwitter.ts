import * as twitter from '../clients/twitter';
import { redirect } from '../responses';
import withApiHandler from '../withApiHandler';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  const { authorizeUrl, oauthToken } = await twitter.getAuthorizeUrl();

  const trailAuthSession = new TrailAuthSessionModel({
    sessionId: `twitter|${oauthToken}`,
    trailId: 'hydrocut'
  });

  await trailAuthSession.save();

  return redirect(authorizeUrl);
};

export default withApiHandler(handler);
