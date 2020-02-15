import * as facebook from '../clients/facebook';
import { redirect, fail } from '../responses';
import TrailAuthSessionModel from '../models/TrailAuthSessionModel';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    const { authorizeUrl, state } = await facebook.getAuthorizeUrl();

    const trailAuthSession = new TrailAuthSessionModel({
      sessionId: `facebook|${state}`,
      trailId: 'hydrocut'
    });
    await trailAuthSession.save();

    return redirect(authorizeUrl);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
