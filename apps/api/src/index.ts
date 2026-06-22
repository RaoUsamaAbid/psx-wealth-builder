import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { APP_NAME } from '@psx/shared';
import { config } from './config.js';
import { connectDb, pingDb, closeDb } from './db.js';
import { makeRepositories, type Repositories } from './repositories.js';
import { companiesRouter } from './routes/companies.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Lazy, cached repositories — connects to Mongo on first data request.
let reposCache: Repositories | null = null;
async function getRepos(): Promise<Repositories> {
  if (reposCache) return reposCache;
  const db = await connectDb();
  reposCache = makeRepositories(db);
  return reposCache;
}

app.use('/companies', companiesRouter(getRepos));

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

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'not found' });
});

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'internal error';
  console.error('[api] error:', message);
  res.status(500).json({ error: 'internal server error' });
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
