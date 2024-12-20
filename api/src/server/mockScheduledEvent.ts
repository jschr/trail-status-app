import merge from 'deepmerge';

export default (
  overrides: Partial<AWSLambda.ScheduledEvent> = {},
): AWSLambda.ScheduledEvent => {
  const defaultEvent: AWSLambda.ScheduledEvent = {
    account: '',
    region: '',
    detail: null,
    'detail-type': 'Scheduled Event',
    source: 'local',
    time: '',
    id: '',
    resources: [],
    version: '0',
  };

  return merge(defaultEvent, overrides);
};
