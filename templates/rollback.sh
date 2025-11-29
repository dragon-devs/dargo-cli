#!/usr/bin/env bash
set -euo pipefail

APP="$1"
DEPLOY_PATH="$2"
PM2_NAME="$3"
TARGET_RELEASE="$4"

RELEASES="$DEPLOY_PATH/releases"
CURRENT="$DEPLOY_PATH/current"

if [ -n "$TARGET_RELEASE" ]; then
  PREV="$RELEASES/$TARGET_RELEASE"
else
  # Fallback: Get previous release folder (exclude archives)
  PREV_NAME=$(ls -1dt $RELEASES/*/ | sed -n '2p')
  PREV="$PREV_NAME"
fi

if [ ! -d "$PREV" ]; then
  echo "Release directory not found: $PREV"
  exit 1
fi

echo "== Rolling back $APP to $PREV =="

# Update symlink
ln -sfn "$PREV" "$CURRENT"

# Restart PM2 cleanly
pm2 delete "$PM2_NAME" 2>/dev/null || true
cd "$CURRENT"
pm2 start pnpm --name "$PM2_NAME" -- start
pm2 save

echo "Rolled back to $PREV"
