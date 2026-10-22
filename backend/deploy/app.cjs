// Passenger startup file. Copy to the application root as app.cjs (or app.js).
const path = require('node:path');
const fs = require('node:fs');
process.chdir(__dirname);
process.env.TOKIO_WORKER_THREADS ||= '2';
process.env.RAYON_NUM_THREADS ||= '2';
process.env.UV_THREADPOOL_SIZE ||= '2';
const release = fs.realpathSync(path.join(__dirname, 'current'));
process.env.DOTENV_CONFIG_PATH = path.join(__dirname, 'shared', 'runtime.env');
process.env.APP_REVISION = fs.readFileSync(path.join(release, 'REVISION'), 'utf8').trim();
// Passenger has a smaller PATH than SSH, which can change Prisma's OpenSSL
// detection. Use the native engine generated on this host for this release.
const engineDirectory = path.join(release, 'node_modules', '.prisma', 'client');
const engines = fs.readdirSync(engineDirectory).filter(name => /^libquery_engine-.*\.so\.node$/.test(name));
if (engines.length !== 1) throw new Error('Expected one host-generated Prisma query engine');
process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(engineDirectory, engines[0]);
import(require('node:url').pathToFileURL(path.join(release, 'dist', 'server.js')).href)
  .catch(error => { console.error(error); process.exit(1); });
