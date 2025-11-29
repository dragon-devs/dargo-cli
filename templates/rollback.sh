#!/usr/bin/env bash
set -euo pipefail

APP="$1"
DEPLOY_PATH="$2"
PM2_NAME="$3"

RELEASES="$DEPLOY_PATH/releases"
CURRENT="$DEPLOY_PATH/current"

# Get previous release folder (exclude archives)
PREV=$(ls -1dt $RELEASES/*/ | sed -n '2p')  # second newest folder
if [ -z "$PREV" ]; then
  echo "No previous release to roll back to."
  exit 1
fi

echo "== Rolling back $APP to $PREV =="

# Update symlink
ln -sfn "$PREV" "$CURRENT"

# Restart PM2 cleanly
pm2 delete "$PM2_NAME" 2>/dev/null || true
cd "$CURRENT"
pm2 start npm --name "$PM2_NAME" -- start
pm2 save

echo "Rolled back to $PREV"
