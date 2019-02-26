#!/bin/bash

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ $BRANCH == "master" ]
then
  echo "On master branch. Checking version for deploy."
else
  echo "On $BRANCH branch. Skipping deploy."
  exit 0
fi

VERSION="v$(node -p "require('./package.json').version")"

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

git checkout -b release-$VERSION
git add .gitignore
git add --all dist/
git commit --message "Release version $VERSION"
git tag $VERSION
git push origin refs/tags/$VERSION

TRAVIS_TAG=true
