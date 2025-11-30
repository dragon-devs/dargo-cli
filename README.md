# dargo-cli

> **Lightning-fast Next.js deployment to any VPS** - One command to ship with SSL, zero-downtime, and automatic rollbacks.

A powerful, minimalist deployment tool for Next.js applications to Debian-based VPS servers with automatic SSL, environment management, and zero-downtime deployments.

## Features

✨ **One-command deployment** - Deploy your Next.js app with a single command  
🔒 **Automatic SSL** - Let's Encrypt SSL certificates configured automatically  
🔥 **Zero-downtime** - Rolling deployments with automatic rollback capability  
🚀 **Fast deployments** - Uses pnpm for lightning-fast package installation  
🔐 **Firewall setup** - UFW firewall configured automatically  
📦 **Version tracking** - Each deployment tagged with version and tracking ID  
🌍 **Environment management** - Push/pull .env files easily  
📊 **Server monitoring** - View logs, status, and restart your app remotely  

## Installation

```bash
npm install -g dargo
# or
pnpm add -g dargo
```

## Quick Start

### 1. Initialize Configuration

```bash
dargo init
```

This creates a `dargo.config.json` file. Edit it with your server details:

```json
{
  "server": {
    "host": "your.server.ip.or.host",
    "port": 22,
    "user": "admin",
    "pem": "./keys/your.pem"
  },
  "app": {
    "name": "app.yourdomain.com",
    "deployPath": "/var/www/app.yourdomain.com",
    "pm2AppName": "app.yourdomain.com",
    "port": 3000,
    "email": "admin@yourdomain.com"
  },
  "keepReleases": 3
}
```

### 2. Provision Your Server

Run this once to set up your server with Node.js, PM2, Nginx, SSL, and firewall:

```bash
dargo provision
```

This will:
- Install Node.js 24, PM2, pnpm, Nginx, Certbot, and UFW
- Configure firewall (allow SSH and HTTP/HTTPS)
- Set up SSL certificate with Let's Encrypt
- Create deployment directory structure

### 3. Set Up Environment Variables

Create a `.env.production` file locally, then push it to the server:

```bash
dargo env push
```

### 4. Deploy Your App

```bash
dargo deploy
```

This will:
- Build your Next.js app locally
- Create a versioned archive (e.g., `myapp-v1.0.0-x7z9q2.tar.gz`)
- Upload to server
- Install production dependencies with pnpm
- Link environment variables
- Restart the app with PM2
- Clean up old releases (keeps last 3 by default)

## Commands

### Core Commands

#### `dargo init`
Create a configuration file in the current directory.

#### `dargo provision [options]`
Bootstrap your Debian server (run once).

**Options:**
- `-f, --force` - Force overwrite of nginx, ecosystem, and deploy structure

#### `dargo deploy [options]`
Build and deploy your Next.js app.

**Options:**
- `--no-build` - Skip running pnpm build (use existing build)

#### `dargo rollback`
Interactive rollback to a previous release. Shows a list of available releases to choose from.

### Management Commands

#### `dargo env <action> [options]`
Manage environment variables on the server.

**Actions:**
- `push` - Upload local .env.production to server
- `pull` - Download server .env to .env.remote locally

**Options:**
- `-f, --file <path>` - Local env file to push (default: .env.production)

**Examples:**
```bash
# Push .env.production to server
dargo env push

# Push a different file
dargo env push -f .env.staging

# Pull server env to local file
dargo env pull
```

#### `dargo logs [options]`
View PM2 logs from the server.

**Options:**
- `-n, --lines <number>` - Number of lines to show (default: 100)

**Example:**
```bash
dargo logs -n 200
```

#### `dargo status`
Check the current status of your app on the server.

#### `dargo restart`
Restart your app on the server (useful after env changes).

#### `dargo ssh`
Connect directly to your server via SSH using the credentials from your config file.

**Example:**
```bash
dargo ssh
```

This opens an interactive SSH session. Type `exit` to disconnect.

## Architecture

### Directory Structure on Server

```
/var/www/your-app/
├── current -> releases/your-app-v1.0.0-abc123/  (symlink to active release)
├── releases/
│   ├── your-app-v1.0.0-abc123/
│   ├── your-app-v0.9.0-xyz789/
│   └── your-app-v0.8.0-def456/
└── shared/
    ├── .env
    └── ecosystem.config.js
```

**How the `current` Symlink Works:**
- Your app **always runs from `/current`**, which is a symbolic link
- During deployment, we create a new release directory, then atomically update the symlink
- This is the industry-standard approach (used by Capistrano, Deployer, etc.)
- **Why it's stable:**
  - Symlink updates are atomic operations (all-or-nothing)
  - PM2 tracks the process, not the directory path
  - Old version keeps running until PM2 restarts
  - If anything fails, the old symlink remains intact

### How It Works

1. **Provision**: Sets up the server infrastructure
2. **Deploy**: 
   - Builds locally
   - Creates versioned archive
   - Uploads to server
   - Extracts to new release directory
   - Installs dependencies with pnpm
   - Links shared .env file
   - Updates `current` symlink
   - Restarts PM2
   - Cleans old releases
3. **Rollback**: Updates `current` symlink to previous release and restarts

## Version Tracking

Each deployment creates an archive named with:
- App name
- Version from package.json
- Random tracking ID

Example: `myapp-v1.2.3-x7z9q2.tar.gz`

This makes it easy to identify and rollback to specific versions.

## SSL & Security

- **Automatic SSL**: Let's Encrypt certificates are automatically obtained and configured
- **Auto-renewal**: Certbot handles certificate renewal automatically
- **Firewall**: UFW is configured to allow only SSH and HTTP/HTTPS traffic
- **Idempotent**: Running provision multiple times is safe - it won't regenerate SSL certs

## Environment Variables

Environment variables are stored in `/var/www/your-app/shared/.env` and symlinked to each release. This means:
- Env vars persist across deployments
- You can update them without redeploying
- Use `dargo env push` to update and `dargo restart` to apply changes

## Troubleshooting

### View logs
```bash
dargo logs
```

### Check app status
```bash
dargo status
```

### Restart app
```bash
dargo restart
```

### Rollback to previous version
```bash
dargo rollback
```

### Re-provision server
```bash
dargo provision --force
```

## Requirements

- **Local**: Node.js 18+, pnpm (optional, npm works too)
- **Server**: Debian-based Linux (Ubuntu, Debian)
- **SSH**: SSH access with key-based authentication


## Author
Salman Khan 
