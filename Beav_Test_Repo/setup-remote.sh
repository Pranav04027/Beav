#!/bin/bash

# Setup Beav_Test_Repo as a GitHub remote
# Usage: ./setup-remote.sh <owner> <repo-name>

OWNER=$1
REPO_NAME=$2

if [ -z "$OWNER" ] || [ -z "$REPO_NAME" ]; then
  echo "Usage: $0 <owner> <repo-name>"
  echo "Example: $0 pranav Beav_Test_Repo"
  exit 1
fi

# Rename master to main
git branch -m master main

# Create the repo on GitHub
gh repo create "${OWNER}/${REPO_NAME}" --public --source=. --push

echo ""
echo "Repo pushed to https://github.com/${OWNER}/${REPO_NAME}"
echo ""
echo "Next steps:"
echo "1. Set up Beav config in your .env:"
echo "   REPO_OWNER=${OWNER}"
echo "   REPO_NAME=${REPO_NAME}"
echo "   ISSUE_TITLE=autofix"
echo "2. Run ./create-issues.sh ${OWNER} ${REPO_NAME} to create test issues"
echo "3. Start Beav: beav start"
