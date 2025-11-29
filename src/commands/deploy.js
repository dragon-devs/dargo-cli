import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { NodeSSH } from 'node-ssh';
import archiver from 'archiver';
import chalk from 'chalk';
import { readConfig } from '../utils/config.js';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ssh = new NodeSSH();

async function createReleaseArchive(cfg) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `${cfg.app.name}-${ts}.tar.gz`;

    const outArchive = path.resolve(process.cwd(), name);

    const output = fs.createWriteStream(outArchive);
    const archive = archiver('tar', { gzip: true });

    return new Promise(async (resolve, reject) => {
        output.on('close', () => resolve(outArchive));
        archive.on('error', err => reject(err));

        archive.pipe(output);

        const standalone = path.join(process.cwd(), '.next', 'standalone');

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
    .option('-c, --config <path>', 'path to shipnext.config.json', 'shipnext.config.json')
    .option('--no-build', 'skip running pnpm build')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);

        if (opts.build) {
            console.log(chalk.blue('Installing and building locally (pnpm install && pnpm build)...'));
            spawnSync('pnpm', ['install'], { stdio: 'inherit', shell: true });
            spawnSync('pnpm', ['build'], { stdio: 'inherit', shell: true });
        } else {
            console.log(chalk.yellow('Skipping build (--no-build).'));
        }

        console.log(chalk.blue('Packaging release...'));
        const archivePath = await createReleaseArchive(cfg);
        console.log(chalk.green(`Archive created: ${archivePath}`));

        console.log(chalk.blue(`Connecting to ${cfg.server.user}@${cfg.server.host}`));

        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });

        const remoteReleases = `${cfg.app.deployPath}/releases`;
        await ssh.execCommand(`sudo mkdir -p ${remoteReleases} && sudo chown -R $USER:$USER ${cfg.app.deployPath}`);

        const remoteArchive = `${remoteReleases}/${path.basename(archivePath)}`;

        console.log(chalk.blue(`Uploading archive to ${remoteArchive}`));
        await ssh.putFile(archivePath, remoteArchive);

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const localReleaseScript = path.join(__dirname, '../../templates/release.sh');

        await ssh.putFile(localReleaseScript, '/opt/ship-next/release.sh');
        await ssh.execCommand('chmod +x /opt/ship-next/release.sh');

        console.log(chalk.blue('Triggering remote release.sh'));

        // THE FIX IS HERE — using full absolute path for archive
        const cmdStr = `bash /opt/ship-next/release.sh "${remoteArchive}" "${cfg.app.name}" "${cfg.app.deployPath}" "${cfg.app.pm2AppName}" "${cfg.keepReleases || 3}" "${cfg.app.port}"`;

        console.log(chalk.magenta('---------------------------------------------------'));
        console.log(chalk.magenta(' STARTING REMOTE RELEASE '));
        console.log(chalk.magenta('---------------------------------------------------'));

        await ssh.execCommand(cmdStr, {
            onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
            onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
        });

        console.log(chalk.magenta('---------------------------------------------------'));

        console.log(chalk.green('Deploy finished.'));

        ssh.dispose();
        await fs.remove(archivePath).catch(() => { });
    });

export default cmd;
