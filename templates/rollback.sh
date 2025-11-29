#!/usr/bin/env bash
set -e
APP="$1"
DEPLOY_PATH="$2"
PM2_NAME="$3"

RELEASES="$DEPLOY_PATH/releases"
PREV=$(ls -1dt $RELEASES/* | sed -n '2p')
if [ -z "$PREV" ]; then
  echo "No previous release to roll back to."
  exit 1
fi
ln -sfn "$PREV" "$DEPLOY_PATH/current"
pm2 reload "$PM2_NAME" --update-env || pm2 restart "$PM2_NAME"
echo "Rolled back to $PREV"
