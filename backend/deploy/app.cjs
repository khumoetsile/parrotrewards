// Passenger startup file. Copy to the application root as app.cjs (or app.js).
const path = require('node:path');
const fs = require('node:fs');
process.chdir(__dirname);
const release = fs.realpathSync(path.join(__dirname, 'current'));
process.env.DOTENV_CONFIG_PATH = path.join(__dirname, 'shared', 'runtime.env');
process.env.APP_REVISION = fs.readFileSync(path.join(release, 'REVISION'), 'utf8').trim();
import(require('node:url').pathToFileURL(path.join(release, 'dist', 'server.js')).href)
  .catch(error => { console.error(error); process.exit(1); });
