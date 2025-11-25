import { program } from 'commander';
import deploy from './commands/deploy.js';
import provision from './commands/provision.js';
import rollback from './commands/rollback.js';

program
    .name('shipnext')
    .description('Deploy Next.js → Debian with a single command')
    .version('0.0.1');

program
    .command('deploy')
    .description('Build and deploy your Next.js app')
    .action(deploy);

program
    .command('provision')
    .description('Prepare a fresh Debian server')
    .action(provision);

program
    .command('rollback')
    .description('Rollback to previous release')
    .action(rollback);

program.parse();
