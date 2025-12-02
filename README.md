# dargo-cli

[![npm version](https://img.shields.io/npm/v/dargo-cli)]()
[![npm downloads](https://img.shields.io/npm/dm/dargo-cli)]()
[![GitHub stars](https://img.shields.io/github/stars/dragon-devs/dargo-cli)]()
[![License](https://img.shields.io/github/license/dragon-devs/dargo-cli)]()

> **Lightning-fast Next.js deployment to any VPS** — One-command shipping with SSL, zero downtime, rollbacks, environment sync, and full autopilot server provisioning.

A powerful, production-grade deployment tool for Next.js applications targeting Debian-based VPS servers. Designed for builders who want modern DevOps capabilities without the DevOps overhead.

---

## Key Features

✨ **One-command deployment** — Ship instantly with `dargo deploy`  
🔒 **Automatic SSL** — Full Let's Encrypt integration  
🔥 **Zero‑downtime** — Atomic symlink switching with rollback safety  
🚀 **Ultra-fast deployments** — pnpm-powered, optimized build flow  
🛡️ **Security-first** — Automatic UFW firewall rules + key-based SSH  
📦 **Release management** — Versioned releases with cleanup  
🌍 **Environment sync** — Push/pull .env files seamlessly  
📊 **Observability** — Logs, status, restart, and SSH built-in  
🔧 **Full provisioning** — Node.js 24, Nginx, PM2, SSL, firewall  
📁 **Capistrano-style structure** — Industry-standard deployment layout  

---

## Installation

```bash
npm install -g dargo-cli
# or
pnpm add -g dargo-cli
```

---

## Quick Start

### 1. Create Config

```bash
dargo init
```

This generates `dargo.config.json`:

```json
{
  "server": {
    "host": "your.server.ip",
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

---

### 2. Provision the VPS

```bash
dargo provision
```

Installs:

- Node.js 24  
- PM2  
- pnpm  
- Nginx  
- SSL (Let's Encrypt)  
- UFW firewall  
- Deployment directory structure  

---

### 3. Sync Environment Variables

```bash
dargo env push
```

---

### 4. Deploy

```bash
dargo deploy
```

---

## Commands Overview

### Core

| Command | Description |
|--------|-------------|
| `dargo init` | Create config |
| `dargo provision` | Bootstrap the server |
| `dargo deploy` | Build + deploy (supports `--legacy-peer-deps`) |
| `dargo rollback` | Revert to a previous release |

### Advanced Usage
#### Dependency Management
If you encounter issues with dependency installation (e.g., peer dependency conflicts), you have several options:

1. **Legacy Peer Deps (Local + Remote)**: Applies legacy behavior to both local build and remote server.
   ```bash
   dargo deploy --legacy-peer-deps
   ```

2. **Remote Only**: Applies legacy behavior *only* to the remote server. Use this if your local build works fine but the server needs the flag.
   ```bash
   dargo deploy --remote-legacy-peer-deps
   ```

3. **Skip Local Install**: If you have already installed dependencies locally and want to avoid Dargo reinstalling them (which might break things), use `--no-install`.
   ```bash
   dargo deploy --no-install
   # or combine with remote legacy flag
   dargo deploy --no-install --remote-legacy-peer-deps
   ```

#### Automatic Optimization
- **Memory Cleanup**: Both `provision` and `deploy` commands now automatically clear system caches (RAM) and package manager caches to ensure optimal performance, especially on smaller instances.
- **Service Refresh**: Redeployments automatically reload/restart Nginx to ensure configuration changes take effect immediately.

### Management

| Command | Description |
|--------|-------------|
| `dargo env push/pull` | Manage .env.production files |
| `dargo logs` | Stream PM2 logs |
| `dargo status` | Check app status |
| `dargo restart` | Restart app |
| `dargo ssh` | SSH directly |

---

## Server Architecture

```
/var/www/app/
├── current -> releases/app-v1.0.0-abc123/
├── releases/
│   ├── app-v1.0.0-abc123/
│   ├── app-v0.9.0-xyz789/
└── shared/
    ├── .env
    └── ecosystem.config.js
```

**Why it’s stable:**  
- Atomic symlink switches  
- Old version stays active until PM2 restart  
- Rollbacks are instant  
- Identical to patterns used by Capistrano, Laravel Forge, Deployer  

---

## Versioning

Release naming:

```
{name}-v{package.json version}-{randomId}.tar.gz
```

Example:

```
myapp-v1.2.3-x7z9q2.tar.gz
```

---

## Requirements

### Local
- Node.js 18+
- pnpm (recommended)
- SSH key auth

### Server
- Debian / Ubuntu VPS
- Root or sudo access

---

## Troubleshooting

```bash
dargo logs
dargo status
dargo restart
dargo rollback
dargo provision --force
```

---

## Contributing

Please read the [Contributing Guide](https://github.com/dragon-devs/dargo-cli/blob/main/CONTRIBUTING.md) for contribution standards, issue templates, branching rules, and testing workflow.


Star the repo to support ongoing development.

---

## Author  
Salman Khan  
`dargo-cli` by dragondevs
