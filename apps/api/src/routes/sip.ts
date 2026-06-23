import { Router } from 'express';
import { generatePortfolio, planFromPortfolio, simulateSip } from '@psx/engines';
import { loadUniverse, type Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';
import { parsePortfolioRequest } from './parse.js';

type ReposResolver = () => Promise<Repositories>;

// Long-term price-path assumption: EPS growth floored at 0 (no perpetual decline).
const RETURN_FLOOR = 0;
const RETURN_CAP = 0.3;
const clampReturn = (r: number): number => Math.max(RETURN_FLOOR, Math.min(RETURN_CAP, r));

export function sipRouter(getRepos: ReposResolver): Router {
  const router = Router();

  /**
   * POST /sip — simulate monthly investing.
   * Body = portfolio request, plus optional:
   *   months                 override (default durationYears * 12, 1..600)
   *   expectedAnnualReturn   flat return for every holding (fraction)
   *   includeTimeline        return month-by-month series (default true)
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

      let months = Math.round(request.durationYears * 12);
      if (b.months !== undefined) {
        const m = Number(b.months);
        if (!Number.isInteger(m) || m < 1 || m > 600) {
          res.status(400).json({ error: 'months must be an integer between 1 and 600' });
          return;
        }
        months = m;
      }

      let flatReturn: number | undefined;
      if (b.expectedAnnualReturn !== undefined) {
        const r = Number(b.expectedAnnualReturn);
        if (!Number.isFinite(r) || r < -0.5 || r > 1) {
          res.status(400).json({ error: 'expectedAnnualReturn must be between -0.5 and 1' });
          return;
        }
        flatReturn = r;
      }
      const includeTimeline = b.includeTimeline !== false;

      const repos = await getRepos();
      const universe = await loadUniverse(repos);
      const portfolio = generatePortfolio(universe, request);

      // Per-symbol expected return defaults to (clamped) EPS growth from
      // fundamentals; a flat override applies to every holding when supplied.
      const epsGrowthBySymbol = new Map(
        universe
          .filter((d) => d.fundamentals != null)
          .map((d) => [d.company.symbol, clampReturn(d.fundamentals!.epsGrowth)])
      );
      const returnFor = (symbol: string): number | undefined =>
        flatReturn ?? epsGrowthBySymbol.get(symbol);

      const plan = planFromPortfolio(portfolio, returnFor, flatReturn ?? 0);
      const result = simulateSip(plan, {
        monthlyInvestmentAmount: request.monthlyInvestmentAmount,
        months,
      });

      const { timeline, ...rest } = result;
      res.json({
        request,
        ...rest,
        timeline: includeTimeline ? timeline : undefined,
      });
    })
  );

  return router;
}
