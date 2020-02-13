set -e

# Move dev node_modules to tmp and install production node_modules.
mkdir -p tmp
mv node_modules tmp/node_modules
yarn install --pure-lockfile --production

# Package source.
zip -r tmp/package.zip node_modules api utilities -x */aws-sdk/\* */cdk.out/\* 

# Restore dev node_modules.
rm -rf node_modules
mv tmp/node_modules node_modules