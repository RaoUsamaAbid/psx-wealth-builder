import { Router } from 'express';
import type { CompanyData } from '@psx/shared';
import {
  dividendCagr,
  dividendPlanFromPortfolio,
  forecastDividends,
  generatePortfolio,
} from '@psx/engines';
import { loadUniverse, type Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';
import { parsePortfolioRequest } from './parse.js';

type ReposResolver = () => Promise<Repositories>;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Latest dividend-per-share from a company's history (most recent year). */
function latestDps(d: CompanyData): number {
  if (d.dividends.length === 0) return 0;
  return d.dividends.reduce((a, b) => (b.year > a.year ? b : a)).amountPerShare;
}

export function dividendsRouter(getRepos: ReposResolver): Router {
  const router = Router();

  /**
   * POST /dividends — forecast dividend income for a generated portfolio under
   * both reinvest scenarios. Body = portfolio request, plus optional `years`
   * (default round(durationYears), 1..50).
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

      const repos = await getRepos();
      const universe = await loadUniverse(repos);
      const portfolio = generatePortfolio(universe, request);

      const bySymbol = new Map(universe.map((d) => [d.company.symbol, d]));
      const plan = dividendPlanFromPortfolio(portfolio, (symbol) => {
        const d = bySymbol.get(symbol);
        return {
          expectedAnnualReturn: clamp(d?.fundamentals?.epsGrowth ?? 0, -0.1, 0.3),
          startDps: d ? latestDps(d) : 0,
          dividendGrowth: clamp(d ? dividendCagr(d.dividends) : 0, 0, 0.25),
        };
      });

      const common = { monthlyInvestmentAmount: request.monthlyInvestmentAmount, years };
      res.json({
        request,
        years,
        reinvestOff: forecastDividends(plan, { ...common, reinvest: false }),
        reinvestOn: forecastDividends(plan, { ...common, reinvest: true }),
      });
    })
  );

  return router;
}
