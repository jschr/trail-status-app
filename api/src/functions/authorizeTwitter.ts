import * as twitter from '../clients/twitter';
import { redirect, fail } from '../responses';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  try {
    const authorizeUrl = await twitter.getAuthorizeUrl();
    return redirect(authorizeUrl);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
