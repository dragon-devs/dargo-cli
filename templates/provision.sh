set -e
APP="$1"
DEPLOY_PATH="$2"
PORT="$3"
FORCE="$4"   # "force" or "no-force"

# If force mode: wipe nginx + ecosystem + deploy structure
if [ "$FORCE" = "force" ]; then
  echo "Force mode ON — wiping old configuration."

  # remove old ecosystem file
  sudo rm -f "$DEPLOY_PATH/shared/ecosystem.config.js"

  # remove nginx config completely
  sudo rm -f "/etc/nginx/sites-available/${APP}"
  sudo rm -f "/etc/nginx/sites-enabled/${APP}"

  # optional: wipe current + releases (but keep shared)
  sudo rm -rf "$DEPLOY_PATH/current" || true
  sudo rm -rf "$DEPLOY_PATH/releases" || true
fi


# create deploy folders
sudo mkdir -p "$DEPLOY_PATH"/{releases,shared}
sudo chown -R "$USER":"$USER" "$DEPLOY_PATH" || true

# install node (NodeSource setup for Node 24)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs build-essential
fi

# install pm2
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

# install nginx
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y nginx
fi

# create a basic ecosystem file in shared if not exists
ECOS="$DEPLOY_PATH/shared/ecosystem.config.js"
if [ ! -f "$ECOS" ]; then
  cat > "$ECOS" <<EOF
module.exports = {
  apps: [{
    name: '${APP}',
    cwd: '${DEPLOY_PATH}/current',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: ${PORT}
    }
  }]
};
EOF
fi

# basic nginx template (user must edit server_name)
NGINX_CONF="/etc/nginx/sites-available/${APP}"
if [ ! -f "$NGINX_CONF" ]; then
  sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
  listen 80;
  server_name REPLACE_APP;
  root /var/www/REPLACE_APP/current/;
  index index.html index.htm;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
EOF
  sudo sed -i "s|REPLACE_APP|${APP}|g" "$NGINX_CONF"
  sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${APP}"
  sudo rm -f /etc/nginx/sites-enabled/default || true
  sudo nginx -t && sudo systemctl reload nginx || true
fi

echo "Provision completed for ${APP} at ${DEPLOY_PATH}"
