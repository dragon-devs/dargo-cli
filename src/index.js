import { program } from 'commander';
import initCmd from './commands/init.js';
import provisionCmd from './commands/provision.js';
import deployCmd from './commands/deploy.js';
import rollbackCmd from './commands/rollback.js';
import logsCmd from './commands/logs.js';
import envCmd from './commands/env.js';
import statusCmd from './commands/status.js';
import restartCmd from './commands/restart.js';
import sshCmd from './commands/ssh.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');


program
    .name('dargo')
    .description('dargo — lightning-fast Next.js -> VPS deployer')
    .version(pkg.version);

program.addCommand(initCmd);
program.addCommand(provisionCmd);
program.addCommand(deployCmd);
program.addCommand(rollbackCmd);
program.addCommand(logsCmd);
program.addCommand(envCmd);
program.addCommand(statusCmd);
program.addCommand(restartCmd);
program.addCommand(sshCmd);

program.parse(process.argv);
