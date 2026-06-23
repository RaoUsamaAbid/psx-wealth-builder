import { Router } from 'express';
import { recommendMonthlyBuys } from '@psx/engines';
import type { LedgerHolding } from '@psx/shared';
import type { AccountRepositories } from '../account/repos.js';
import { asyncHandler } from '../async-handler.js';
import { requireAuth, type AuthedRequest } from '../auth/jwt.js';
import { loadUniverse, type Repositories } from '../repositories.js';
import { parsePortfolioRequest } from './parse.js';

type AccountResolver = () => Promise<AccountRepositories>;
type ReposResolver = () => Promise<Repositories>;

function optionalNumber(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number
): { value?: number; error?: string } {
  if (body[key] === undefined) return {};
  const value = Number(body[key]);
  if (!Number.isFinite(value) || value < min || value > max) {
    return { error: `${key} must be a number between ${min} and ${max}` };
  }
  return { value };
}

export function recommendationsRouter(
  getAccount: AccountResolver,
  getRepos: ReposResolver
): Router {
  const router = Router();
  router.use(requireAuth);

  router.post(
    '/monthly',
    asyncHandler(async (req: AuthedRequest, res) => {
      const { request, error } = parsePortfolioRequest(req.body);
      if (!request) {
        res.status(400).json({ error });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const carried = optionalNumber(body, 'carriedCash', 0, 1_000_000_000);
      const dividends = optionalNumber(body, 'availableDividends', 0, 1_000_000_000);
      const feeRate = optionalNumber(body, 'estimatedFeeRate', 0, 0.1);
      const maxOrders = optionalNumber(body, 'maxOrders', 1, 10);
      const optionError = carried.error ?? dividends.error ?? feeRate.error ?? maxOrders.error;
      if (optionError) {
        res.status(400).json({ error: optionError });
        return;
      }
      if (maxOrders.value !== undefined && !Number.isInteger(maxOrders.value)) {
        res.status(400).json({ error: 'maxOrders must be an integer between 1 and 10' });
        return;
      }

      const [account, repos] = await Promise.all([getAccount(), getRepos()]);
      const [history, universe] = await Promise.all([
        account.history.listByUser(req.userId!),
        loadUniverse(repos),
      ]);
      const sharesBySymbol = new Map<string, number>();
      for (const entry of history) {
        sharesBySymbol.set(entry.symbol, (sharesBySymbol.get(entry.symbol) ?? 0) + entry.shares);
      }
      const currentHoldings: LedgerHolding[] = [...sharesBySymbol.entries()].map(
        ([symbol, shares]) => ({ symbol, shares })
      );

      const recommendation = recommendMonthlyBuys(universe, request, currentHoldings, {
        carriedCash: carried.value,
        availableDividends: dividends.value,
        estimatedFeeRate: feeRate.value,
        maxOrders: maxOrders.value,
      });
      res.json(recommendation);
    })
  );

  return router;
}
