import { assert } from '@trail-status-app/utilities';
import TrailStatusModel from '../models/TrailStatusModel';
import TrailSettingsModel from '../models/TrailSettingsModel';
import UserModel from '../models/UserModel';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError, NotFoundError } from '../HttpError';
import { parseQuery } from '../requests';

interface GetTrailStatus {
  trailId: string;
}

export default withApiHandler([], async event => {
  const { trailId } = assertGetTrailStatus(parseQuery(event));
  const [trailStatus, trailSettings] = await Promise.all([
    TrailStatusModel.get(trailId),
    TrailSettingsModel.get(trailId),
  ]);

  if (!trailStatus) {
    throw new NotFoundError(`Could not find trail status for '${trailId}'`);
  }

  if (!trailSettings) {
    throw new NotFoundError(`Could not find trail settings for '${trailId}'`);
  }

  const user = await UserModel.get(trailSettings.userId);
  if (!user) {
    throw new NotFoundError(
      `Could not find user for '${trailSettings.userId}'`,
    );
  }

  return json({
    ...trailStatus.toJSON(),
    user: user.toJSON(),
  });
});

const assertGetTrailStatus = (query: any): GetTrailStatus => {
  assert(
    !query || typeof query !== 'object',
    new BadRequestError('Invalid query.'),
  );

  assert(
    typeof query.trailId !== 'string',
    new BadRequestError('Invalid trailId provided in query.'),
  );

  return query as GetTrailStatus;
};
