import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import fs from 'fs-extra';
import { readConfig } from '../utils/config.js';

const cmd = new Command('ssh')
    .description('Connect to server via SSH')
    .option('-c, --config <path>', 'path to dargo.config.json', 'dargo.config.json')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);

        console.log(chalk.blue(`Connecting to ${cfg.server.user}@${cfg.server.host}...`));
        console.log(chalk.gray('Type "exit" to disconnect\n'));

        const sshArgs = [
            `${cfg.server.user}@${cfg.server.host}`,
            '-p', cfg.server.port || '22'
        ];

        if (cfg.server.pem && fs.existsSync(cfg.server.pem)) {
            sshArgs.push('-i', cfg.server.pem);
        }

        const sshProcess = spawn('ssh', sshArgs, {
            stdio: 'inherit',
            shell: true
        });

        sshProcess.on('exit', (code) => {
            if (code === 0) {
                console.log(chalk.green('\nSSH session closed.'));
            } else {
                console.log(chalk.yellow(`\nSSH session closed with code ${code}.`));
            }
        });

        sshProcess.on('error', (err) => {
            console.error(chalk.red('Failed to start SSH:'), err.message);
            console.log(chalk.yellow('\nMake sure SSH is installed on your system.'));
        });
    });

export default cmd;
