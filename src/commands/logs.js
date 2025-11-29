import { Command } from 'commander';
import { NodeSSH } from 'node-ssh';
import chalk from 'chalk';
import fs from 'fs-extra';
import { readConfig } from '../utils/config.js';

const ssh = new NodeSSH();

const cmd = new Command('logs')
    .description('View server logs (PM2)')
    .option('-c, --config <path>', 'path to shipnext.config.json', 'shipnext.config.json')
    .option('-n, --lines <number>', 'number of lines to show', '15')
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
        console.log(chalk.magenta(` FETCHING LOGS FOR ${cfg.app.pm2AppName} `));
        console.log(chalk.magenta('---------------------------------------------------'));

        // We use 'pm2 logs' but since it streams, we might want 'pm2 logs --lines N --nostream' or just 'pm2 logs' and let user ctrl+c
        // For a simple "view logs" tool, streaming is nice, but ssh.execCommand waits.
        // If we want to stream, we use exec and pipe stdout.

        // Let's do a static fetch first, or stream if possible. 
        // The user said "control the server logs", implying viewing them.
        // 'pm2 logs' without arguments streams.

        console.log(chalk.cyan(`Streaming logs (Press Ctrl+C to exit)...`));

        await ssh.execCommand(`pm2 logs ${cfg.app.pm2AppName} --lines ${opts.lines}`, {
            onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
            onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
        });

        ssh.dispose();
    });

export default cmd;
