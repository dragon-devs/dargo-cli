import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { NodeSSH } from 'node-ssh';
import archiver from 'archiver';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig } from '../utils/config.js';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ssh = new NodeSSH();

async function createReleaseArchive(cfg, archiveName) {
    const outArchive = path.resolve(process.cwd(), archiveName);

    const output = fs.createWriteStream(outArchive);
    const archive = archiver('tar', { gzip: true });

    return new Promise(async (resolve, reject) => {
        output.on('close', () => resolve(outArchive));
        archive.on('error', err => reject(err));

        archive.pipe(output);

        const standalone = path.join(process.cwd(), '.next', 'standalone');

        // Clean up .next/dev and .next/cache before archiving
        const nextDevPath = path.join(process.cwd(), '.next', 'dev');
        const nextCachePath = path.join(process.cwd(), '.next', 'cache');

        if (await fs.pathExists(nextDevPath)) {
            await fs.remove(nextDevPath);
        }

        if (await fs.pathExists(nextCachePath)) {
            await fs.remove(nextCachePath);
        }

        if (await fs.pathExists(standalone)) {
            archive.directory(standalone, false);
            if (await fs.pathExists('public')) archive.directory('public', 'public');
            archive.file('package.json', { name: 'package.json' });
        } else {
            archive.directory('.next', '.next');
            archive.directory('public', 'public');
            archive.file('package.json', { name: 'package.json' });
        }

        await archive.finalize();
    });
}

const cmd = new Command('deploy')
    .description('Build local Next.js and deploy to configured server')
    .option('-c, --config <path>', 'path to dargo.config.json', 'dargo.config.json')
    .option('--no-build', 'skip running pnpm build')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);
        const pkg = await fs.readJSON(path.resolve(process.cwd(), 'package.json')).catch(() => ({ version: '0.0.0' }));

        // Generate tracking ID (random 6 chars)
        const trackingId = Math.random().toString(36).substring(2, 8);
        const version = pkg.version || '0.0.0';

        if (opts.build) {
            const buildSpinner = ora('Installing dependencies...').start();
            spawnSync('pnpm', ['install'], { stdio: 'inherit', shell: true });
            buildSpinner.succeed('Dependencies installed');

            const compileSpinner = ora('Building Next.js application...').start();
            spawnSync('pnpm', ['build'], { stdio: 'inherit', shell: true });
            compileSpinner.succeed('Build completed');
        } else {
            console.log(chalk.yellow('⚠ Skipping build (--no-build).'));
        }

        const archiveSpinner = ora('Packaging release archive...').start();

        // Create archive with new naming convention: appName-vVersion-TrackingId.tar.gz
        const archiveName = `${cfg.app.name}-v${version}-${trackingId}.tar.gz`;
        const archivePath = await createReleaseArchive(cfg, archiveName);
        archiveSpinner.succeed(`Archive created: ${chalk.cyan(archiveName)}`);

        const connectSpinner = ora(`Connecting to ${cfg.server.user}@${cfg.server.host}...`).start();

        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });
        connectSpinner.succeed(`Connected to ${chalk.cyan(cfg.server.host)}`);

        const setupSpinner = ora('Preparing remote directories...').start();
        const remoteReleases = `${cfg.app.deployPath}/releases`;
        await ssh.execCommand(`sudo mkdir -p ${remoteReleases} && sudo chown -R $USER:$USER ${cfg.app.deployPath}`);
        setupSpinner.succeed('Remote directories ready');

        const remoteArchive = `${remoteReleases}/${path.basename(archivePath)}`;

        const uploadSpinner = ora('Uploading archive to server...').start();
        await ssh.putFile(archivePath, remoteArchive);
        uploadSpinner.succeed('Archive uploaded successfully');

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const localReleaseScript = path.join(__dirname, '../../templates/release.sh');

        const scriptSpinner = ora('Uploading release script...').start();
        await ssh.putFile(localReleaseScript, '/opt/dargo/release.sh');
        await ssh.execCommand('chmod +x /opt/dargo/release.sh');
        scriptSpinner.succeed('Release script ready');

        const deploySpinner = ora('Deploying application...').start();
        deploySpinner.stop();

        // Pass the archive name (without extension) as the release folder name if needed, 
        // but release.sh currently handles extraction to a temp folder. 
        // We will pass the full archive path as before.
        const cmdStr = `bash /opt/dargo/release.sh "${remoteArchive}" "${cfg.app.name}" "${cfg.app.deployPath}" "${cfg.app.pm2AppName}" "${cfg.keepReleases || 3}" "${cfg.app.port}"`;

        console.log(chalk.magenta('---------------------------------------------------'));
        console.log(chalk.magenta(' STARTING REMOTE RELEASE '));
        console.log(chalk.magenta('---------------------------------------------------'));

        await ssh.execCommand(cmdStr, {
            onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
            onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
        });

        console.log(chalk.magenta('---------------------------------------------------'));

        const successSpinner = ora().start();
        successSpinner.succeed(chalk.green.bold('Deploy finished successfully!'));
        console.log(chalk.cyanBright(`\n🚀 Your app is live at: https://${cfg.app.name}\n`));

        const cleanupSpinner = ora('Cleaning up local files...').start();
        ssh.dispose();
        await fs.remove(archivePath).catch(() => { });
        cleanupSpinner.succeed('Cleanup completed');
    });

export default cmd;
