import { json } from '../responses';
import withApiHandler from '../withApiHandler';

export default withApiHandler([], async event => {
  const payload = event.body;
  console.info(`Test webhook received payload '${event.body}'`);
  return json(payload);
});
