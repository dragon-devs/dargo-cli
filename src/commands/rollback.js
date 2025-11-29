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

        // Get current release
        const currentRes = await ssh.execCommand(`readlink -f ${cfg.app.deployPath}/current`);
        const currentRelease = currentRes.stdout.trim().split('/').pop();

        // Filter and parse releases
        const allReleases = res.stdout.split('\n').map(r => r.trim()).filter(r => r.length > 0);

        // Filter out .tar.gz files and temp directories
        const releases = allReleases.filter(r => {
            return !r.endsWith('.tar.gz') && !r.includes('-temp-');
        });

        if (releases.length === 0) {
            console.log(chalk.yellow('No releases found.'));
            ssh.dispose();
            return;
        }

        // Parse and format releases
        const formatRelease = (releaseName, isCurrent) => {
            // Try to extract version from name (e.g., app-v1.0.0-abc123)
            const versionMatch = releaseName.match(/-v([\d.]+)-([a-z0-9]+)$/);

            if (versionMatch) {
                const version = versionMatch[1];
                const trackingId = versionMatch[2];

                if (isCurrent) {
                    return `${chalk.green('● CURRENT')} ${chalk.cyan(`v${version}`)} ${chalk.gray(`(${trackingId})`)}`;
                } else {
                    return `  ${chalk.cyan(`v${version}`)} ${chalk.gray(`(${trackingId})`)}`;
                }
            } else {
                // Fallback for old format releases
                if (isCurrent) {
                    return `${chalk.green('● CURRENT')} ${chalk.gray(releaseName)}`;
                } else {
                    return `  ${chalk.gray(releaseName)}`;
                }
            }
        };

        // Create choices with formatted titles
        const choices = releases.map((r, index) => {
            const isCurrent = r === currentRelease;
            const isLatest = index === 0 && !isCurrent;

            let title = formatRelease(r, isCurrent);

            if (isLatest) {
                title = `${chalk.yellow('★ LATEST')} ${title.trim()}`;
            }

            return {
                title,
                value: r,
                description: isCurrent ? 'Currently deployed' : (isLatest ? 'Most recent release' : '')
            };
        });

        console.log(chalk.blue('\nAvailable releases:\n'));

        const response = await prompts({
            type: 'select',
            name: 'value',
            message: 'Select a release to rollback to:',
            choices,
            initial: 0
        });

        if (!response.value) {
            console.log(chalk.yellow('Rollback cancelled.'));
            ssh.dispose();
            return;
        }

        const targetRelease = response.value;

        // Check if user selected current release
        if (targetRelease === currentRelease) {
            console.log(chalk.yellow('Selected release is already the current one. No action needed.'));
            ssh.dispose();
            return;
        }

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
        console.log(chalk.green('Rollback finished successfully!'));
        console.log(chalk.cyanBright(`\nYour app is live at: https://${cfg.app.name}\n`));
        ssh.dispose();
    });

export default cmd;
