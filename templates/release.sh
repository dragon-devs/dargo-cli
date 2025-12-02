#!/bin/bash
set -euo pipefail

ARCHIVE="$1"          # absolute path to archive
APP_NAME="$2"
DEPLOY_PATH="$3"
PM2_NAME="$4"
KEEP_RELEASES="$5"    # normally 3
# $6 is PORT (unused here but passed by deploy.js)
LEGACY_PEER_DEPS="${7:-false}"

RELEASES_DIR="$DEPLOY_PATH/releases"
CURRENT_SYMLINK="$DEPLOY_PATH/current"

echo "== Validating archive path =="
if [ ! -f "$ARCHIVE" ]; then
    echo "ERROR: Archive not found at: $ARCHIVE"
    exit 1
fi

mkdir -p "$RELEASES_DIR"

# Extract release name from archive filename (e.g., app-v1.0.0-abc123.tar.gz -> app-v1.0.0-abc123)
ARCHIVE_BASENAME=$(basename "$ARCHIVE" .tar.gz)
TIMESTAMP=$(date +%s)
TEMP_DIR="$RELEASES_DIR/${ARCHIVE_BASENAME}-temp-$TIMESTAMP"

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

INSTALL_CMD="pnpm install --prod --frozen-lockfile=false"

if [ "$LEGACY_PEER_DEPS" = "true" ]; then
    echo "Using legacy peer dependencies mode..."
    INSTALL_CMD="$INSTALL_CMD --config.strict-peer-dependencies=false"
fi

$INSTALL_CMD

# Promote temp folder into final release using the archive name
FINAL_RELEASE="$RELEASES_DIR/${ARCHIVE_BASENAME}"
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

echo "== Reloading Nginx =="
sudo systemctl reload nginx || sudo systemctl restart nginx

echo "== Clearing memory and package caches =="
sudo apt-get clean
sudo sync
echo 3 | sudo tee /proc/sys/vm/drop_caches

echo "== Deploy finished =="
