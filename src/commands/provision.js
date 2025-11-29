import { Command } from 'commander';
import { NodeSSH } from 'node-ssh';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { readConfig } from '../utils/config.js';
import { fileURLToPath } from 'url';

const ssh = new NodeSSH();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const cmd = new Command('provision')
    .description('Bootstrap Debian server (run once)')
    .option('-c, --config <path>', 'path to shipnext.config.json', 'shipnext.config.json')
    .option('-f, --force', 'force overwrite of nginx + ecosystem + deploy structure')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);

        const localScript = path.join(root, 'templates', 'provision.sh');
        console.log('Looking for template at:', localScript);

        if (!await fs.pathExists(localScript)) {
            console.error(chalk.red('provision.sh template missing in templates/'));
            process.exit(1);
        }

        console.log(chalk.blue(`Connecting to ${cfg.server.user}@${cfg.server.host}:${cfg.server.port}`));
        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });

        if (opts.force) {
            console.log(chalk.yellow('Force mode: wiping old deploy folders'));
            await ssh.execCommand(`sudo rm -rf ${cfg.app.deployPath}/*`);
        }

        // ensure /opt/ship-next exists and upload scripts
        await ssh.execCommand('sudo mkdir -p /opt/ship-next && sudo chown $USER:$USER /opt/ship-next');
        await ssh.putFile(localScript, '/opt/ship-next/provision.sh');
        await ssh.execCommand('chmod +x /opt/ship-next/provision.sh');

        const forceFlag = opts.force ? 'force' : 'no-force';
        const email = cfg.app.email || '';
        console.log(chalk.blue('Running remote provision.sh (requires sudo).'));
        const res = await ssh.execCommand(
            `bash /opt/ship-next/provision.sh ${cfg.app.name} ${cfg.app.deployPath} ${cfg.app.port} ${forceFlag} "${email}"`
        );
        console.log(res.stdout);
        console.error(res.stderr);

        console.log(chalk.green('Provision complete. Verify server manually if necessary.'));
        ssh.dispose();
    });

export default cmd;
