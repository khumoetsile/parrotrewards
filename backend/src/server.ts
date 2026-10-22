import { createApp } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
const server = createApp().listen(config.PORT, '0.0.0.0', () => console.log(`API listening on port ${config.PORT}`));
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 30000);
  deadline.unref();
  server.close(async () => {
    await db.$disconnect();
    clearTimeout(deadline);
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
