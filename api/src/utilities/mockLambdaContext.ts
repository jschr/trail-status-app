import merge from 'deepmerge';

export default (
  overides: Partial<AWSLambda.Context> = {}
): AWSLambda.Context => {
  const defaultContext: AWSLambda.Context = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: '',
    functionVersion: '',
    invokedFunctionArn: '',
    memoryLimitInMB: '256',
    awsRequestId: '',
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: () => +new Date(),
    done: () => {},
    fail: () => {},
    succeed: () => {}
  };

  return merge(defaultContext, overides);
};
