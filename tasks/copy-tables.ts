import dynamodb from '../api/src/models/dynamodb';

const sourceProject = 'TrailStatusApp2';
const destinationProject = 'TrailStatusApp3';
const tables = [
  'regions',
  'regionStatus',
  'regionStatusHistory',
  'trails',
  'trailStatus',
  'users',
  'webhooks',
];

// Copy dymamodb tables from one project to another.

const copyTables = async () => {
  for (const table of tables) {
    const sourceTable = `${sourceProject}-${table}`;
    const destinationTable = `${destinationProject}-${table}`;

    console.log(`Copying ${sourceTable} to ${destinationTable}...`);

    const { Items = [] } = await dynamodb.scan({ TableName: sourceTable });

    for (const item of Items) {
      await dynamodb.putItem({
        TableName: destinationTable,
        Item: item,
      });
    }

    console.log(
      `Copied ${Items.length} items from ${sourceTable} to ${destinationTable}.`,
    );
  }
};

copyTables().catch(console.error);
