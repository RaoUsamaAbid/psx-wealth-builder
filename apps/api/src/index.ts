import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { closeDb } from './db.js';
import { createApp } from './app.js';
import { startRealtime, type RealtimeHandle } from './market/realtime.js';

validateConfig(); // fail fast on missing/insecure production config

const { app, quoteService, providerName } = createApp();

const server = app.listen(config.port, config.host, () => {
  logger.info({ host: config.host, port: config.port, env: config.env }, 'API listening');
});

// Start the realtime quote loop (socket.io push + periodic DB read).
const realtime: RealtimeHandle = startRealtime(server, quoteService, {
  intervalMs: config.marketRefreshMs,
  corsOrigin: config.corsOrigin,
});
logger.info(
  { provider: providerName, refreshMs: config.marketRefreshMs },
  'realtime board started'
);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  await realtime.stop();
  server.close();
  await closeDb();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection');
});
