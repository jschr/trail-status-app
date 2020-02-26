import TrailSettingsModel from '../models/TrailSettingsModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import getDefaultTrailId from '../getDefaultTrailId';

export default withApiHandler([P.SettingsRead], async event => {
  const defaultTrailId = getDefaultTrailId(event.decodedToken?.sub ?? '');
  const trailSettings = await TrailSettingsModel.get(defaultTrailId);

  return json(trailSettings);
});
