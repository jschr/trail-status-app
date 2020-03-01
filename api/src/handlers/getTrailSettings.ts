import TrailSettingsModel from '../models/TrailSettingsModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import getDefaultTrailId from '../getDefaultTrailId';
import { NotFoundError } from '../HttpError';

export default withApiHandler([P.SettingsRead], async event => {
  const defaultTrailId = getDefaultTrailId(event.decodedToken?.sub ?? '');
  const trailSettings = await TrailSettingsModel.get(defaultTrailId);

  if (!trailSettings) {
    throw new NotFoundError(
      `Could not find trail settings for '${defaultTrailId}'`
    );
  }

  return json(trailSettings);
});
