import merge from 'deepmerge';

export default (
  overides: Partial<AWSLambda.APIGatewayEvent> = {}
): AWSLambda.APIGatewayEvent => {
  const defaultEvent = {
    body: '',
    headers: {},
    multiValueHeaders: {},
    httpMethod: '',
    isBase64Encoded: false,
    path: '',
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    resource: '',
    requestContext: {
      accountId: '',
      apiId: '',
      httpMethod: '',
      identity: {
        accessKey: '',
        accountId: '',
        apiKey: '',
        apiKeyId: '',
        caller: '',
        cognitoAuthenticationProvider: '',
        cognitoAuthenticationType: '',
        cognitoIdentityId: '',
        cognitoIdentityPoolId: '',
        sourceIp: '',
        user: '',
        userAgent: '',
        userArn: ''
      },
      path: '',
      stage: '',
      requestId: `${+new Date()}`,
      requestTimeEpoch: +new Date(),
      resourceId: '',
      resourcePath: ''
    }
  };

  return merge(defaultEvent, overides);
};
