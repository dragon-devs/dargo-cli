import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const sample = {
    server: {
        host: "your.server.ip.or.host",
        port: 22,
        user: "admin",
        pem: "./keys/your.pem"
    },
    app: {
        name: "app.yourdomain.com",
        deployPath: "/var/www/app.yourdomain.com",
        pm2AppName: "app.yourdomain.com",
        port: 3000,
        email: "admin@yourdomain.com"
    },
    keepReleases: 3
};

const cmd = new Command('init')
    .description('Create shipnext.config.json in current folder')
    .action(async () => {
        const dest = path.resolve(process.cwd(), 'shipnext.config.json');
        if (await fs.pathExists(dest)) {
            console.log(chalk.yellow('shipnext.config.json already exists — aborting.'));
            process.exit(1);
        }
        await fs.writeJSON(dest, sample, { spaces: 2 });
        console.log(chalk.green(`Created ${dest}. Edit it with your server info.`));
    });

export default cmd;
