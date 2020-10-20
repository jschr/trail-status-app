export default (fn: AWSLambda.SQSHandler): AWSLambda.SQSHandler => (
  event: AWSLambda.SQSEvent,
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
