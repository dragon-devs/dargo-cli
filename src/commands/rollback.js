import {Command} from 'commander';
import chalk from 'chalk';
import {NodeSSH} from 'node-ssh';
import {readConfig} from '../utils/config.js';
import fs from 'fs-extra';
import {fileURLToPath} from 'url';
import path from 'path';

const ssh = new NodeSSH();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rollbackLocal = path.join(__dirname, '../../templates/rollback.sh');


const cmd = new Command('rollback')
    .description('Rollback remote to previous release')
    .option('-c, --config <path>', 'path to shipnext.config.json', 'shipnext.config.json')
    .action(async (opts) => {
        const cfg = readConfig(opts.config);
        await ssh.connect({
            host: cfg.server.host,
            port: cfg.server.port || 22,
            username: cfg.server.user,
            privateKey: cfg.server.pem && fs.readFileSync(cfg.server.pem).toString()
        });

        // upload rollback script if missing
        await ssh.putFile(rollbackLocal, '/opt/ship-next/rollback.sh');
        await ssh.execCommand('chmod +x /opt/ship-next/rollback.sh');

        const cmdStr = `bash /opt/ship-next/rollback.sh ${cfg.app.name} ${cfg.app.deployPath} ${cfg.app.pm2AppName}`;
        const res = await ssh.execCommand(cmdStr);
        console.log(res.stdout);
        console.error(res.stderr);
        ssh.dispose();
    });

export default cmd;
