import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export function readConfig(p = 'dargo.config.json') {
    const cfgPath = path.resolve(process.cwd(), p);
    if (!fs.existsSync(cfgPath)) {
        console.error(chalk.red(`Config file not found: ${cfgPath}. Run "dargo init" first.`));
        process.exit(1);
    }
    return fs.readJSONSync(cfgPath);
}
