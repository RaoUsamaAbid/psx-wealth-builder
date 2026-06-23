import { Router } from 'express';
import type { QuoteService } from '../market/quote-service.js';
import type { Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';
import { requireAuth } from '../auth/jwt.js';
import { runMarketSync, getSyncStatus } from '../market/sync.js';
import { runDeepSync, getDeepSyncStatus, isDeepSyncRunning } from '../market/deep-sync.js';
import { syncLimiter } from '../middleware/rate-limit.js';

type ReposResolver = () => Promise<Repositories>;

export function marketRouter(quotes: QuoteService, getRepos: ReposResolver): Router {
  const router = Router();

  // GET /market/status — provider, realtime status, last updated, freshness.
  router.get('/status', (_req, res) => {
    res.json(quotes.snapshot());
  });

  // GET /market/quotes — cached quotes (from the last sync).
  router.get('/quotes', (_req, res) => {
    res.json({ ...quotes.snapshot(), quotes: quotes.quotesList() });
  });

  router.get('/quotes/:symbol', (req, res) => {
    const quote = quotes.getQuote(req.params.symbol ?? '');
    if (!quote) {
      res.status(404).json({ error: `no cached quote for ${req.params.symbol}` });
      return;
    }
    res.json({ ...quotes.snapshot(), quote });
  });

  // GET /market/sync/status — quick + deep sync state.
  router.get(
    '/sync/status',
    asyncHandler(async (_req, res) => {
      const repos = await getRepos();
      res.json({ sync: await getSyncStatus(repos), deep: await getDeepSyncStatus(repos) });
    })
  );

  // POST /market/sync — scrape PSX market-watch and refresh the DB universe.
  // Any signed-in user can trigger it.
  router.post(
    '/sync',
    syncLimiter,
    requireAuth,
    asyncHandler(async (_req, res) => {
      const status = await runMarketSync(await getRepos());
      await quotes.refresh(); // immediately reflect new prices on the live board
      res.json({ sync: status });
    })
  );

  // POST /market/sync/deep — start the background deep sync (real fundamentals).
  router.post(
    '/sync/deep',
    syncLimiter,
    requireAuth,
    asyncHandler(async (_req, res) => {
      if (isDeepSyncRunning()) {
        res.status(409).json({ error: 'a deep sync is already running' });
        return;
      }
      const repos = await getRepos();
      void runDeepSync(repos); // fire-and-forget; poll /sync/status for progress
      res.status(202).json({ started: true });
    })
  );

  return router;
}
