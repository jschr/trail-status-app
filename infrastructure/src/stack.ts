import * as cdk from '@aws-cdk/core';
// import dynamodb from '@aws-cdk/aws-dynamodb';

export default class extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const table = new dynamodb.Table(this, 'trail_status', {
    //   partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    // });

    // console.log('TABLE', table);
  }
}
