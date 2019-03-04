#!/bin/bash

VERSION="v$(node -p "require('./package.json').version")"

git checkout master
git pull
git fetch --tags
VERSION_COUNT=$(git tag --list $VERSION | wc -l)

if [ $VERSION_COUNT -gt 0 ]
then
  echo "Version $VERSION already deployed"
  exit 0
else
  echo "Deploying version $VERSION"
fi

echo '!/dist' >> .gitignore

npm install
npm test
npm run build

git checkout -b release-$VERSION
git add .gitignore
git add --all dist/
git commit --message "Release version $VERSION"
git tag $VERSION
git push origin refs/tags/$VERSION

npm publish

git checkout master
git branch --delete --force release-$VERSION
