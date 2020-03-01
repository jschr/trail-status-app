import * as instagram from '../clients/instagram';
import { redirect } from '../responses';
import withApiHandler from '../withApiHandler';

export default withApiHandler([], async () => {
  const { authorizeUrl } = await instagram.getAuthorizeUrl();
  return redirect(authorizeUrl);
});
