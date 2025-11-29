import { Command } from 'commander';
import { NodeSSH } from 'node-ssh';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { readConfig } from '../utils/config.js';

const ssh = new NodeSSH();

const cmd = new Command('restart')
    .description('Restart the app on the server')
    .option('-c, --config <path>', 'path to dargo.config.json', 'dargo.config.json')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);

        const connectSpinner = ora(`Connecting to ${cfg.server.user}@${cfg.server.host}...`).start();

        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });

        connectSpinner.succeed(`Connected to ${chalk.cyan(cfg.server.host)}`);

        const restartSpinner = ora('Restarting application...').start();
        restartSpinner.stop();

        console.log(chalk.magenta('---------------------------------------------------'));
        console.log(chalk.magenta(` RESTARTING ${cfg.app.pm2AppName} `));
        console.log(chalk.magenta('---------------------------------------------------'));

        await ssh.execCommand(`pm2 restart ${cfg.app.pm2AppName}`, {
            onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
            onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
        });

        console.log(chalk.magenta('---------------------------------------------------'));

        const successSpinner = ora().start();
        successSpinner.succeed(chalk.green.bold('App restarted successfully!'));

        ssh.dispose();
    });

export default cmd;