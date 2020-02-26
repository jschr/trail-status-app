// import TrailSettingsModel from '../models/TrailSettingsModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions } from '../jwt';

export default withApiHandler([Permissions.SettingsRead], async event => {
  // const trailSettings = await TrailSettingsModel.get('hydrocut');
  return json(event.decodedToken);
});
