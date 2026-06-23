import express, { type NextFunction, type Request, type Response, type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { APP_NAME } from '@psx/shared';
import { config } from './config.js';
import { connectDb, pingDb } from './db.js';
import { makeRepositories, type Repositories } from './repositories.js';
import { companiesRouter } from './routes/companies.js';
import { portfolioRouter } from './routes/portfolio.js';
import { sipRouter } from './routes/sip.js';
import { dividendsRouter } from './routes/dividends.js';
import { projectionRouter } from './routes/projection.js';
import { healthScoreRouter } from './routes/health-score.js';
import { rebalanceRouter } from './routes/rebalance.js';
import { marketRouter } from './routes/market.js';
import { QuoteService } from './market/quote-service.js';
import { DbQuoteProvider } from './market/db-provider.js';
import {
  makeAccountRepositories,
  ensureAccountIndexes,
  type AccountRepositories,
} from './account/repos.js';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';

export interface AppContext {
  app: Express;
  quoteService: QuoteService;
  getRepos: () => Promise<Repositories>;
  getAccount: () => Promise<AccountRepositories>;
  providerName: string;
}

/**
 * Build the Express app and its dependencies WITHOUT side effects (no listen,
 * no socket.io loop). `index.ts` wires those up for the running server; tests
 * import this directly with supertest.
 */
export function createApp(): AppContext {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  let reposCache: Repositories | null = null;
  const getRepos = async (): Promise<Repositories> => {
    if (reposCache) return reposCache;
    const db = await connectDb();
    reposCache = makeRepositories(db);
    return reposCache;
  };

  let accountCache: AccountRepositories | null = null;
  const getAccount = async (): Promise<AccountRepositories> => {
    if (accountCache) return accountCache;
    const db = await connectDb();
    await ensureAccountIndexes(db);
    accountCache = makeAccountRepositories(db);
    return accountCache;
  };

  app.use('/companies', companiesRouter(getRepos));
  app.use('/portfolio', portfolioRouter(getRepos));
  app.use('/sip', sipRouter(getRepos));
  app.use('/dividends', dividendsRouter(getRepos));
  app.use('/projection', projectionRouter(getRepos));
  app.use('/portfolio-health', healthScoreRouter(getRepos));
  app.use('/rebalance', rebalanceRouter(getRepos));

  // Realtime board reads last-synced quotes from the DB (no scraping loop);
  // scraping happens only on the explicit Sync action.
  const provider = new DbQuoteProvider(getRepos);
  const quoteService = new QuoteService(
    provider,
    async () => (await (await getRepos()).companies.findAll()).map((c) => c.symbol),
    async () => {}, // no write-back; the DB is already the source of truth
    config.quoteFreshnessMs
  );
  app.use('/market', marketRouter(quoteService, getRepos));

  app.use('/auth', authRouter(getAccount));
  app.use('/me', accountRouter(getAccount, getRepos));

  app.get('/health', async (_req, res) => {
    const dbOk = await pingDb();
    res.json({
      app: APP_NAME,
      status: 'ok',
      env: config.env,
      db: dbOk ? 'connected' : 'unavailable',
      provider: provider.name,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/', (_req, res) => {
    res.json({ app: APP_NAME, message: 'API up. See /health.' });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'internal error';
    console.error('[api] error:', message);
    res.status(500).json({ error: 'internal server error' });
  });

  return { app, quoteService, getRepos, getAccount, providerName: provider.name };
}
