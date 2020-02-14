import * as twitter from '../clients/twitter';
import { redirect, fail } from '../responses';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    const { authorizeUrl, oauthToken } = await twitter.getAuthorizeUrl();

    const trailAuthSession = new TrailAuthSessionModel({
      sessionId: `twitter|${oauthToken}`,
      trailId: 'hydrocut'
    });
    await trailAuthSession.save();

    return redirect(authorizeUrl);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
