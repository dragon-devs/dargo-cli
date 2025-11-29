import { Command } from 'commander';
import chalk from 'chalk';
import { NodeSSH } from 'node-ssh';
import { readConfig } from '../utils/config.js';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import path from 'path';
import prompts from 'prompts';

const ssh = new NodeSSH();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rollbackLocal = path.join(__dirname, '../../templates/rollback.sh');


const cmd = new Command('rollback')
    .description('Rollback remote to previous release')
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

        // List releases
        const releasesPath = `${cfg.app.deployPath}/releases`;
        const res = await ssh.execCommand(`ls -1t ${releasesPath}`);

        if (res.stderr) {
            console.error(chalk.red('Failed to list releases:'), res.stderr);
            ssh.dispose();
            return;
        }

        const releases = res.stdout.split('\n').map(r => r.trim()).filter(r => r.length > 0);

        if (releases.length === 0) {
            console.log(chalk.yellow('No releases found.'));
            ssh.dispose();
            return;
        }

        const response = await prompts({
            type: 'select',
            name: 'value',
            message: 'Select a release to rollback to:',
            choices: releases.map(r => ({ title: r, value: r })),
            initial: 0
        });

        if (!response.value) {
            console.log(chalk.yellow('Rollback cancelled.'));
            ssh.dispose();
            return;
        }

        const targetRelease = response.value;
        console.log(chalk.blue(`Rolling back to: ${targetRelease}`));

        // upload rollback script if missing
        await ssh.putFile(rollbackLocal, '/opt/ship-next/rollback.sh');
        await ssh.execCommand('chmod +x /opt/ship-next/rollback.sh');

        const cmdStr = `bash /opt/ship-next/rollback.sh "${cfg.app.name}" "${cfg.app.deployPath}" "${cfg.app.pm2AppName}" "${targetRelease}"`;

        console.log(chalk.magenta('---------------------------------------------------'));
        console.log(chalk.magenta(' STARTING ROLLBACK '));
        console.log(chalk.magenta('---------------------------------------------------'));

        await ssh.execCommand(cmdStr, {
            onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
            onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
        });

        console.log(chalk.magenta('---------------------------------------------------'));
        ssh.dispose();
    });

export default cmd;
