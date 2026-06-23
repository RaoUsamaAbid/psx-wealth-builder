import { Router } from 'express';
import { asyncHandler } from '../async-handler.js';
import { requireAuth, type AuthedRequest } from '../auth/jwt.js';
import { parsePortfolioRequest } from './parse.js';
import type { Repositories } from '../repositories.js';
import type {
  AccountRepositories,
  SavedPortfolioDoc,
  HistoryDoc,
  WatchlistDoc,
} from '../account/repos.js';

type AccountResolver = () => Promise<AccountRepositories>;
type ReposResolver = () => Promise<Repositories>;

const savedPublic = (d: SavedPortfolioDoc) => ({
  id: d._id!.toString(),
  name: d.name,
  request: d.request,
  createdAt: d.createdAt,
});
const historyPublic = (d: HistoryDoc) => ({
  id: d._id!.toString(),
  symbol: d.symbol,
  shares: d.shares,
  price: d.price,
  date: d.date,
  note: d.note,
  createdAt: d.createdAt,
});
const watchPublic = (d: WatchlistDoc) => ({ symbol: d.symbol, createdAt: d.createdAt });

export function accountRouter(getAccount: AccountResolver, getRepos: ReposResolver): Router {
  const router = Router();
  router.use(requireAuth);

  const knownSymbol = async (symbol: string): Promise<boolean> => {
    const repos = await getRepos();
    return (await repos.companies.findBySymbol(symbol)) != null;
  };

  // ----- Saved portfolios -----
  router.get(
    '/portfolios',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const list = await account.savedPortfolios.listByUser(req.userId!);
      res.json({ portfolios: list.map(savedPublic) });
    })
  );

  router.post(
    '/portfolios',
    asyncHandler(async (req: AuthedRequest, res) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const { request, error } = parsePortfolioRequest(b.request);
      if (!request) {
        res.status(400).json({ error: error ?? 'invalid request' });
        return;
      }
      const account = await getAccount();
      const saved = await account.savedPortfolios.create(req.userId!, name, request);
      res.status(201).json({ portfolio: savedPublic(saved) });
    })
  );

  router.get(
    '/portfolios/:id',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const doc = await account.savedPortfolios.findOne(req.userId!, req.params.id ?? '');
      if (!doc) {
        res.status(404).json({ error: 'portfolio not found' });
        return;
      }
      res.json({ portfolio: savedPublic(doc) });
    })
  );

  router.delete(
    '/portfolios/:id',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const ok = await account.savedPortfolios.delete(req.userId!, req.params.id ?? '');
      if (!ok) {
        res.status(404).json({ error: 'portfolio not found' });
        return;
      }
      res.status(204).end();
    })
  );

  // ----- Watchlist -----
  router.get(
    '/watchlist',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const list = await account.watchlist.listByUser(req.userId!);
      res.json({ watchlist: list.map(watchPublic) });
    })
  );

  router.post(
    '/watchlist',
    asyncHandler(async (req: AuthedRequest, res) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const symbol = typeof b.symbol === 'string' ? b.symbol.trim().toUpperCase() : '';
      if (!symbol) {
        res.status(400).json({ error: 'symbol is required' });
        return;
      }
      if (!(await knownSymbol(symbol))) {
        res.status(404).json({ error: `unknown symbol: ${symbol}` });
        return;
      }
      const account = await getAccount();
      await account.watchlist.add(req.userId!, symbol);
      res.status(201).json({ symbol });
    })
  );

  router.delete(
    '/watchlist/:symbol',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const ok = await account.watchlist.remove(
        req.userId!,
        (req.params.symbol ?? '').toUpperCase()
      );
      if (!ok) {
        res.status(404).json({ error: 'not on watchlist' });
        return;
      }
      res.status(204).end();
    })
  );

  // ----- Investment history -----
  router.get(
    '/history',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const list = await account.history.listByUser(req.userId!);
      res.json({ history: list.map(historyPublic) });
    })
  );

  router.post(
    '/history',
    asyncHandler(async (req: AuthedRequest, res) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const symbol = typeof b.symbol === 'string' ? b.symbol.trim().toUpperCase() : '';
      const shares = Number(b.shares);
      const price = Number(b.price);
      if (!symbol) {
        res.status(400).json({ error: 'symbol is required' });
        return;
      }
      if (!Number.isFinite(shares) || shares <= 0) {
        res.status(400).json({ error: 'shares must be a positive number' });
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        res.status(400).json({ error: 'price must be a positive number' });
        return;
      }
      if (!(await knownSymbol(symbol))) {
        res.status(404).json({ error: `unknown symbol: ${symbol}` });
        return;
      }
      const date =
        typeof b.date === 'string' && !Number.isNaN(Date.parse(b.date))
          ? new Date(b.date).toISOString()
          : new Date().toISOString();
      const note = typeof b.note === 'string' ? b.note.slice(0, 280) : undefined;

      const account = await getAccount();
      const entry = await account.history.create(req.userId!, {
        symbol,
        shares,
        price,
        date,
        note,
      });
      res.status(201).json({ entry: historyPublic(entry) });
    })
  );

  router.delete(
    '/history/:id',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const ok = await account.history.delete(req.userId!, req.params.id ?? '');
      if (!ok) {
        res.status(404).json({ error: 'history entry not found' });
        return;
      }
      res.status(204).end();
    })
  );

  return router;
}
