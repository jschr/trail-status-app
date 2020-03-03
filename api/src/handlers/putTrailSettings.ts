import { assert } from '@trail-status-app/utilities';
import TrailSettingsModel from '../models/TrailSettingsModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { Permissions as P } from '../jwt';
import getDefaultTrailId from '../getDefaultTrailId';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseBody } from '../requests';

interface PutTrailSettings {
  openHashtag: string;
  closeHashtag: string;
}

export default withApiHandler([P.SettingsRead], async event => {
  const { openHashtag, closeHashtag } = assertPutTrailSetting(parseBody(event));
  const defaultTrailId = getDefaultTrailId(event.decodedToken?.sub ?? '');
  const trailSettings = await TrailSettingsModel.get(defaultTrailId);

  if (!trailSettings) {
    throw new NotFoundError(
      `Could not find trail settings for '${defaultTrailId}'`
    );
  }

  await trailSettings.save({
    openHashtag,
    closeHashtag
  });

  return json(trailSettings);
});

const assertPutTrailSetting = (body: any): PutTrailSettings => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.')
  );

  assert(
    typeof body.openHashtag !== 'string',
    new BadRequestError('Invalid openHashtag provided in body.')
  );

  assert(
    typeof body.closeHashtag !== 'string',
    new BadRequestError('Invalid closeHashtag provided in body.')
  );

  return body as PutTrailSettings;
};
