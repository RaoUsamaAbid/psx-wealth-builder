import { APP_NAME } from '@psx/shared';
import { config } from './config.js';
import { closeDb } from './db.js';
import { createApp } from './app.js';
import { startRealtime, type RealtimeHandle } from './market/realtime.js';

const { app, quoteService, providerName } = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`[${APP_NAME}] API listening on http://${config.host}:${config.port}`);
});

// Start the realtime quote loop (socket.io push + periodic refresh).
const realtime: RealtimeHandle = startRealtime(server, quoteService, {
  intervalMs: config.marketRefreshMs,
  corsOrigin: config.corsOrigin,
});
console.log(
  `[${APP_NAME}] realtime market data: provider=${providerName} refresh=${config.marketRefreshMs}ms`
);

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down...`);
  await realtime.stop();
  server.close();
  await closeDb();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
