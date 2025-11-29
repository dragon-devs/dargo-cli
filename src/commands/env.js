import { Command } from 'commander';
import { NodeSSH } from 'node-ssh';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { readConfig } from '../utils/config.js';

const ssh = new NodeSSH();

const cmd = new Command('env')
    .description('Manage remote environment variables')
    .argument('<action>', 'push | pull')
    .option('-c, --config <path>', 'path to dargo.config.json', 'dargo.config.json')
    .option('-f, --file <path>', 'local env file to push (default: .env.production)', '.env.production')
    .action(async (action, opts) => {
        const cfg = readConfig(opts.config);

        const connectSpinner = ora(`Connecting to ${cfg.server.user}@${cfg.server.host}...`).start();
        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });
        connectSpinner.succeed(`Connected to ${chalk.cyan(cfg.server.host)}`);

        const remoteEnvPath = `${cfg.app.deployPath}/shared/.env`;

        if (action === 'push') {
            const localEnvPath = path.resolve(process.cwd(), opts.file);
            if (!fs.existsSync(localEnvPath)) {
                console.error(chalk.red(`Local file not found: ${localEnvPath}`));
                process.exit(1);
            }

            const uploadSpinner = ora(`Uploading ${opts.file} to server...`).start();
            await ssh.putFile(localEnvPath, remoteEnvPath);
            uploadSpinner.succeed('Environment variables uploaded successfully');
            console.log(chalk.yellow('\n⚠ Note: You may need to restart the app for changes to take effect.\n'));
        }
        else if (action === 'pull') {
            const dest = path.resolve(process.cwd(), '.env.remote');
            const downloadSpinner = ora('Downloading remote .env...').start();

            try {
                await ssh.getFile(dest, remoteEnvPath);
                downloadSpinner.succeed(`Downloaded to ${chalk.cyan('.env.remote')}`);
            } catch (e) {
                downloadSpinner.fail('Failed to download .env (maybe it does not exist yet?)');
            }
        }
        else {
            console.error(chalk.red('Invalid action. Use "push" or "pull".'));
        }

        ssh.dispose();
    });

export default cmd;
