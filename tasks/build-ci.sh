set -e

if [ "$BRANCH" = "master" ]
then
  yarn build:production
else
  yarn build:dev
fi

