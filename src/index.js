import { program } from 'commander';
import initCmd from './commands/init.js';
import provisionCmd from './commands/provision.js';
import deployCmd from './commands/deploy.js';
import rollbackCmd from './commands/rollback.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');


program
    .name('ship-next')
    .description('ship-next — lightweight Next.js -> Debian deployer')
    .version(pkg.version);

program.addCommand(initCmd);
program.addCommand(provisionCmd);
program.addCommand(deployCmd);
program.addCommand(rollbackCmd);

program.parse(process.argv);
