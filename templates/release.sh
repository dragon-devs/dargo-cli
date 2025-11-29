#!/bin/bash
set -euo pipefail

ARCHIVE="$1"          # absolute path to archive
APP_NAME="$2"
DEPLOY_PATH="$3"
PM2_NAME="$4"
KEEP_RELEASES="$5"    # normally 3

RELEASES_DIR="$DEPLOY_PATH/releases"
CURRENT_SYMLINK="$DEPLOY_PATH/current"

echo "== Validating archive path =="
if [ ! -f "$ARCHIVE" ]; then
    echo "ERROR: Archive not found at: $ARCHIVE"
    exit 1
fi

mkdir -p "$RELEASES_DIR"

# Create unique release directory
TIMESTAMP=$(date +%s)
TEMP_DIR="$RELEASES_DIR/${APP_NAME}-temp-$TIMESTAMP"

echo "== Creating temp directory: $TEMP_DIR =="
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "== Extracting archive =="
tar -xzf "$ARCHIVE" -C "$TEMP_DIR"

echo "== Installing production dependencies =="
cd "$TEMP_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
    echo "Error: pnpm is not installed on the server. Please run provision again."
    exit 1
fi

pnpm install --prod --frozen-lockfile=false

# Promote temp folder into final release
FINAL_RELEASE="$RELEASES_DIR/${APP_NAME}-${TIMESTAMP}"
mv "$TEMP_DIR" "$FINAL_RELEASE"

echo "== Linking shared .env =="
if [ -f "$DEPLOY_PATH/shared/.env" ]; then
    ln -sf "$DEPLOY_PATH/shared/.env" "$FINAL_RELEASE/.env"
    ln -sf "$DEPLOY_PATH/shared/.env" "$FINAL_RELEASE/.env.production"
fi

echo "== Updating current symlink =="
rm -f "$CURRENT_SYMLINK"
ln -s "$FINAL_RELEASE" "$CURRENT_SYMLINK"

echo "== Restarting PM2 cleanly =="

# Always restart fresh (safer for Next.js)
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 start pnpm --name "$PM2_NAME" -- start
pm2 save

echo "== Cleaning old releases (keeping $KEEP_RELEASES) =="
cd "$RELEASES_DIR"
ls -1dt */ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

echo "== Deploy finished =="
