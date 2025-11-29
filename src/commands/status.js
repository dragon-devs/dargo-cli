import { Command } from 'commander';
import { NodeSSH } from 'node-ssh';
import chalk from 'chalk';
import fs from 'fs-extra';
import { readConfig } from '../utils/config.js';

const ssh = new NodeSSH();

const cmd = new Command('status')
    .description('Check app status on the server')
    .option('-c, --config <path>', 'path to shipnext.config.json', 'shipnext.config.json')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);

        console.log(chalk.blue(`Connecting to ${cfg.server.user}@${cfg.server.host}...`));
        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });

        console.log(chalk.magenta('---------------------------------------------------'));
        console.log(chalk.magenta(` APP STATUS: ${cfg.app.pm2AppName} `));
        console.log(chalk.magenta('---------------------------------------------------'));

        await ssh.execCommand(`pm2 describe ${cfg.app.pm2AppName}`, {
            onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
            onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
        });

        console.log(chalk.magenta('---------------------------------------------------'));
        ssh.dispose();
    });

export default cmd;
