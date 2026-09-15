#!/bin/bash

set -eo pipefail

git checkout main
git pull

PACKAGE=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

if [ -n "$(npm view "$PACKAGE@$VERSION" version 2> /dev/null)" ]
then
  echo "Version $VERSION already published."
  exit 0
fi

echo "Publishing version $VERSION"

npm install
npm test
npm run build

echo '!/dist' >> .gitignore

git checkout -B "release-$VERSION"
git add .gitignore
git add --all dist/
git commit --message "Release version $VERSION"

npm publish

if ! git tag "$TAG" || ! git push origin "refs/tags/$TAG"
then
  echo "Published $VERSION but could not tag it." >&2
fi

git checkout main
git branch --delete --force "release-$VERSION"
