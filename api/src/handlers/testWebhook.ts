import { json } from '../responses';
import withApiHandler from '../withApiHandler';

export default withApiHandler([], async event => {
  console.info(`event.headers`, event.headers);
  console.info(
    'event.queryStringParameters',
    JSON.stringify(event.queryStringParameters),
  );
  console.info('event.body', event.body);
  return json('OK');
});
