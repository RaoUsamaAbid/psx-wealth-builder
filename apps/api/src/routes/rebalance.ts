import { Router } from 'express';
import type { CurrentHolding } from '@psx/shared';
import { generateRebalance } from '@psx/engines';
import { loadUniverse, type Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';
import { parsePortfolioRequest } from './parse.js';

type ReposResolver = () => Promise<Repositories>;

function parseHoldings(input: unknown): { holdings?: CurrentHolding[]; error?: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: 'currentHoldings must be a non-empty array' };
  }
  const holdings: CurrentHolding[] = [];
  for (const row of input) {
    if (typeof row !== 'object' || row === null) {
      return { error: 'each holding must be an object { symbol, shares }' };
    }
    const r = row as Record<string, unknown>;
    if (typeof r.symbol !== 'string' || r.symbol.trim() === '') {
      return { error: 'each holding needs a non-empty symbol' };
    }
    const shares = Number(r.shares);
    if (!Number.isFinite(shares) || shares <= 0) {
      return { error: `shares for ${r.symbol} must be a positive number` };
    }
    holdings.push({ symbol: r.symbol.toUpperCase(), shares });
  }
  return { holdings };
}

export function rebalanceRouter(getRepos: ReposResolver): Router {
  const router = Router();

  /**
   * POST /rebalance — compare current holdings to the ideal target and emit
   * hold/increase/reduce/replace actions. Body = portfolio request, plus:
   *   currentHoldings: [{ symbol, shares }]   (required)
   *   band:            tolerance in percentage points (optional, default 5)
   */
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { request, error } = parsePortfolioRequest(req.body);
      if (!request) {
        res.status(400).json({ error });
        return;
      }
      const b = req.body as Record<string, unknown>;
      const { holdings, error: holdErr } = parseHoldings(b.currentHoldings);
      if (!holdings) {
        res.status(400).json({ error: holdErr });
        return;
      }
      let band = 5;
      if (b.band !== undefined) {
        const n = Number(b.band);
        if (!Number.isFinite(n) || n < 0 || n > 50) {
          res.status(400).json({ error: 'band must be a number between 0 and 50' });
          return;
        }
        band = n;
      }

      const repos = await getRepos();
      const universe = await loadUniverse(repos);
      res.json({ request, ...generateRebalance(universe, request, holdings, { band }) });
    })
  );

  return router;
}
