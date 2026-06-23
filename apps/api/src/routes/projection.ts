import { Router } from 'express';
import { generatePortfolio, projectWealth, type WealthOptions } from '@psx/engines';
import { loadUniverse, type Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';
import { parsePortfolioRequest } from './parse.js';
import { buildDividendPlan } from '../portfolio-plan.js';

type ReposResolver = () => Promise<Repositories>;

export function projectionRouter(getRepos: ReposResolver): Router {
  const router = Router();

  /**
   * POST /projection — long-term wealth projection across conservative / base /
   * optimistic scenarios. Body = portfolio request, plus optional:
   *   years          (default round(durationYears), 1..50)
   *   reinvest       (default true)
   *   targetValue    (optional; solves required monthly to reach this FV)
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

      let years = Math.max(1, Math.round(request.durationYears));
      if (b.years !== undefined) {
        const y = Number(b.years);
        if (!Number.isInteger(y) || y < 1 || y > 50) {
          res.status(400).json({ error: 'years must be an integer between 1 and 50' });
          return;
        }
        years = y;
      }

      const reinvest = b.reinvest !== false; // default true
      const opts: WealthOptions = {
        monthlyInvestmentAmount: request.monthlyInvestmentAmount,
        years,
        reinvest,
      };
      if (b.targetValue !== undefined) {
        const t = Number(b.targetValue);
        if (!Number.isFinite(t) || t <= 0) {
          res.status(400).json({ error: 'targetValue must be a positive number' });
          return;
        }
        opts.targetValue = t;
      }

      const repos = await getRepos();
      const universe = await loadUniverse(repos);
      const portfolio = generatePortfolio(universe, request);
      const plan = buildDividendPlan(universe, portfolio);

      res.json({ request, ...projectWealth(plan, opts) });
    })
  );

  return router;
}
