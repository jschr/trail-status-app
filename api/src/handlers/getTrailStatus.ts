import TrailStatusModel from '../models/TrailStatusModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';

export default withApiHandler([], async () => {
  const trailStatus = await TrailStatusModel.get('hydrocut');
  return json(trailStatus);
});
