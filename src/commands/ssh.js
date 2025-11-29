import { Command } from 'commander';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { readConfig } from '../utils/config.js';

const cmd = new Command('ssh')
    .description('Connect to server via SSH')
    .option('-c, --config <path>', 'path to dargo.config.json', 'dargo.config.json')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);

        const connectSpinner = ora(`Connecting to ${cfg.server.user}@${cfg.server.host}...`).start();

        const sshArgs = [
            `${cfg.server.user}@${cfg.server.host}`,
            '-p', cfg.server.port || '22'
        ];

        if (cfg.server.pem && fs.existsSync(cfg.server.pem)) {
            sshArgs.push('-i', cfg.server.pem);
        }

        connectSpinner.succeed(`Connected to ${chalk.cyan(cfg.server.host)}`);
        console.log(chalk.gray('Type "exit" to disconnect\n'));

        const sshProcess = spawn('ssh', sshArgs, {
            stdio: 'inherit',
            shell: true
        });

        sshProcess.on('exit', (code) => {
            if (code === 0) {
                const exitSpinner = ora().start();
                exitSpinner.succeed(chalk.green('SSH session closed'));
            } else {
                const exitSpinner = ora().start();
                exitSpinner.warn(chalk.yellow(`SSH session closed with code ${code}`));
            }
        });

        sshProcess.on('error', (err) => {
            const errorSpinner = ora().start();
            errorSpinner.fail(chalk.red(`Failed to start SSH: ${err.message}`));
            console.log(chalk.yellow('\nMake sure SSH is installed on your system.'));
        });
    });

export default cmd;