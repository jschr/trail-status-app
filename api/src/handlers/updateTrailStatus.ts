// import path from 'path';
// import fs from 'fs';
import { assert } from '@trail-status-app/utilities';
import TrailStatusModel from '../models/TrailStatusModel';
import { parseBody } from '../requests';
import { json } from '../responses';
import withApiHandler from '../withApiHandler';
import { BadRequestError } from '../HttpError';
// import * as twitter from '../clients/twitter';

type TrailStatus = 'open' | 'closed';

interface UpdateTrailStatus {
  status: TrailStatus;
}

const assertUpdateTrailStatus = (body: any): UpdateTrailStatus => {
  assert(
    !body || typeof body !== 'object',
    new BadRequestError('Invalid body.')
  );

  assert(
    body.status !== 'open' && body.status !== 'closed',
    new BadRequestError(
      'Invalid status provided in body, must be `open` or `closed`.'
    )
  );

  return body as UpdateTrailStatus;
};

// const getTrailStatusImage = (status: TrailStatus) => {
//   const imagePath = path.resolve(__dirname, `../assets/trails-${status}.jpg`);

//   if (fs.existsSync(imagePath)) {
//     return fs.readFileSync(imagePath, { encoding: 'base64' });
//   }

//   return null;
// };

const handler: AWSLambda.APIGatewayProxyHandler = async event => {
  const { status } = assertUpdateTrailStatus(parseBody(event));

  let trailStatus = await TrailStatusModel.get('hydrocut');
  if (!trailStatus) {
    trailStatus = new TrailStatusModel({ trailId: 'hydrocut' });
  }

  const hasStatusChanged = status !== trailStatus.status;
  await trailStatus.save({ status });

  if (hasStatusChanged) {
    // const trailStatusImage = getTrailStatusImage(status);
    // const message = `Trails are ${status}.`;
    // if (trailStatusImage) {
    //   const media = await twitter.uploadMedia(trailStatusImage);
    //   console.log(media);
    //   await twitter.postStatus(message, [media.media_id_string]);
    //   // await twitter.postStatus(message);
    // } else {
    //   await twitter.postStatus(message);
    // }
  }

  return json(trailStatus);
};

export default withApiHandler(handler);
