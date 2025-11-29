import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export function readConfig(p = 'shipnext.config.json') {
    const cfgPath = path.resolve(process.cwd(), p);
    if (!fs.existsSync(cfgPath)) {
        console.error(chalk.red(`Config file not found: ${cfgPath}. Run "ship-next init" first.`));
        process.exit(1);
    }
    return fs.readJSONSync(cfgPath);
}
