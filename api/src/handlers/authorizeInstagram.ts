import * as instagram from '../clients/instagram';
import { redirect } from '../responses';
import withApiHandler from '../withApiHandler';

const handler: AWSLambda.APIGatewayProxyHandler = async () => {
  const { authorizeUrl } = await instagram.getAuthorizeUrl();
  return redirect(authorizeUrl);
};

export default withApiHandler([], handler);
