import TrailStatusModel from '../models/TrailStatusModel';
import { parseBody } from '../requests';
import { success, fail } from '../responses';
import { BadRequestError } from '../HttpError';
import * as twitter from '../clients/twitter';

interface UpdateTrailStatus {
  status: 'open' | 'closed';
}

function assertUpdateTrailStatus(body: any): UpdateTrailStatus {
  if (!body || typeof body !== 'object')
    throw new BadRequestError('Invalid body.');
  if (body.status !== 'open' && body.status !== 'closed')
    throw new BadRequestError(
      'Invalid status provided in body, must be `open` or `closed`.'
    );

  return body as UpdateTrailStatus;
}

const handler: AWSLambda.APIGatewayProxyHandler = async event => {
  try {
    const { status } = assertUpdateTrailStatus(parseBody(event));

    let trailStatus = await TrailStatusModel.get('hydrocut');
    if (!trailStatus) {
      trailStatus = new TrailStatusModel({ trailId: 'hydrocut' });
    }

    await trailStatus.save({ status });
    await twitter.postStatus(`Trails are ${status}.`);

    return success(trailStatus);
  } catch (err) {
    return fail(err);
  }
};

export default handler;
