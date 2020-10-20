import merge from 'deepmerge';

export default (
  overrides: Partial<AWSLambda.SQSEvent> = {},
): AWSLambda.SQSEvent => {
  const defaultEvent: AWSLambda.SQSEvent = {
    Records: [],
  };

  return merge(defaultEvent, overrides);
};
