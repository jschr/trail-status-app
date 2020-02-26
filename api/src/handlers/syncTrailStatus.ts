import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';

export default withApiHandler([P.StatusUpdate], async event => {
  return json(event.decodedToken);
});
