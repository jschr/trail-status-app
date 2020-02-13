import * as twitter from '../clients/twitter';
import { redirect, fail } from '../responses';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    const { authorizeUrl, oauthToken } = await twitter.getAuthorizeUrl();

    // TODO: Save trail id with oauthToken to lookup trail id in the callback.
    console.log(oauthToken);

    return redirect(authorizeUrl);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
