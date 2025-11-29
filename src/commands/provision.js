import { Command } from 'commander';
import { NodeSSH } from 'node-ssh';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig } from '../utils/config.js';
import { fileURLToPath } from 'url';

const ssh = new NodeSSH();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const cmd = new Command('provision')
    .description('Bootstrap Debian server (run once)')
    .option('-c, --config <path>', 'path to dargo.config.json', 'dargo.config.json')
    .option('-f, --force', 'force overwrite of nginx + ecosystem + deploy structure')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);

        const localScript = path.join(root, 'templates', 'provision.sh');
        console.log('Looking for template at:', localScript);

        if (!await fs.pathExists(localScript)) {
            console.error(chalk.red('provision.sh template missing in templates/'));
            process.exit(1);
        }

        const connectSpinner = ora(`Connecting to ${cfg.server.user}@${cfg.server.host}:${cfg.server.port}...`).start();
        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });
        connectSpinner.succeed(`Connected to ${chalk.cyan(cfg.server.host)}`);

        if (opts.force) {
            const cleanSpinner = ora('Force mode: wiping old deploy folders...').start();
            await ssh.execCommand(`sudo rm -rf ${cfg.app.deployPath}/*`);
            cleanSpinner.succeed('Old deploy folders removed');
        }

        // ensure /opt/dargo exists and upload scripts
        const setupSpinner = ora('Preparing server directories...').start();
        await ssh.execCommand('sudo mkdir -p /opt/dargo && sudo chown $USER:$USER /opt/dargo');
        setupSpinner.succeed('Server directories ready');

        const uploadSpinner = ora('Uploading provision script...').start();
        await ssh.putFile(localScript, '/opt/dargo/provision.sh');
        await ssh.execCommand('chmod +x /opt/dargo/provision.sh');
        uploadSpinner.succeed('Provision script uploaded');

        const forceFlag = opts.force ? 'force' : 'no-force';
        const email = cfg.app.email || '';

        console.log(chalk.magenta('---------------------------------------------------'));
        console.log(chalk.magenta(' STARTING PROVISIONING '));
        console.log(chalk.magenta('---------------------------------------------------'));

        const provisionSpinner = ora('Running remote provision script (requires sudo)...').start();
        provisionSpinner.stop();
        await ssh.execCommand(
            `bash /opt/dargo/provision.sh ${cfg.app.name} ${cfg.app.deployPath} ${cfg.app.port} ${forceFlag} "${email}"`,
            {
                onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
                onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
            }
        );

        console.log(chalk.magenta('---------------------------------------------------'));

        const successSpinner = ora().start();
        successSpinner.succeed(chalk.green.bold('Provision complete!'));
        console.log(chalk.cyan('\n✓ Server is ready for deployments\n'));
        ssh.dispose();
    });

export default cmd;
