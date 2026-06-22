import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { APP_NAME } from '@psx/shared';
import { config } from './config.js';
import { pingDb, closeDb } from './db.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  const dbOk = await pingDb();
  res.json({
    app: APP_NAME,
    status: 'ok',
    env: config.env,
    db: dbOk ? 'connected' : 'unavailable',
    provider: config.marketDataProvider,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({ app: APP_NAME, message: 'API up. See /health.' });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`[${APP_NAME}] API listening on http://${config.host}:${config.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down...`);
  server.close();
  await closeDb();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
