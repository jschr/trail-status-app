import merge from 'deepmerge';

export default (
  overrides: Partial<AWSLambda.ScheduledEvent> = {},
): AWSLambda.ScheduledEvent => {
  const defaultEvent: AWSLambda.ScheduledEvent = {
    account: '',
    region: '',
    detail: null,
    'detail-type': '',
    source: 'local',
    time: '',
    id: '',
    resources: [],
  };

  return merge(defaultEvent, overrides);
};
