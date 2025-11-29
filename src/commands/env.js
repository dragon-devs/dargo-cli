import { Command } from 'commander';
import { NodeSSH } from 'node-ssh';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { readConfig } from '../utils/config.js';

const ssh = new NodeSSH();

const cmd = new Command('env')
    .description('Manage remote environment variables')
    .argument('<action>', 'push | pull')
    .option('-c, --config <path>', 'path to shipnext.config.json', 'shipnext.config.json')
    .option('-f, --file <path>', 'local env file to push (default: .env.production)', '.env.production')
    .action(async (action, opts) => {
        const cfg = readConfig(opts.config);

        console.log(chalk.blue(`Connecting to ${cfg.server.user}@${cfg.server.host}...`));
        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });

        const remoteEnvPath = `${cfg.app.deployPath}/shared/.env`;

        if (action === 'push') {
            const localEnvPath = path.resolve(process.cwd(), opts.file);
            if (!fs.existsSync(localEnvPath)) {
                console.error(chalk.red(`Local file not found: ${localEnvPath}`));
                process.exit(1);
            }

            console.log(chalk.blue(`Uploading ${opts.file} to ${remoteEnvPath}...`));
            await ssh.putFile(localEnvPath, remoteEnvPath);
            console.log(chalk.green('Environment variables uploaded successfully.'));
            console.log(chalk.yellow('Note: You may need to restart the app for changes to take effect.'));
        }
        else if (action === 'pull') {
            const dest = path.resolve(process.cwd(), '.env.remote');
            console.log(chalk.blue(`Downloading remote .env to ${dest}...`));

            try {
                await ssh.getFile(dest, remoteEnvPath);
                console.log(chalk.green(`Downloaded to ${dest}`));
            } catch (e) {
                console.error(chalk.red('Failed to download .env (maybe it does not exist yet?)'));
            }
        }
        else {
            console.error(chalk.red('Invalid action. Use "push" or "pull".'));
        }

        ssh.dispose();
    });

export default cmd;
