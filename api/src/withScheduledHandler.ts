export default (fn: AWSLambda.ScheduledHandler): AWSLambda.ScheduledHandler => (
  event: AWSLambda.ScheduledEvent,
  context,
  callback,
) => {
  const returnVal = fn(event, context, callback);

  if (returnVal) {
    return returnVal.catch(err => {
      throw err;
    });
  }

  return returnVal;
};
