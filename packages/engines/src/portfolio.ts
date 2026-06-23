import type { CompanyData, Portfolio, PortfolioHolding, PortfolioRequest } from '@psx/shared';
import { scoreUniverse } from './scoring.js';
import { selectHoldings } from './ranking.js';
import { filterUniverse } from './filters.js';

const DEFAULT_COUNT = 10;
const DEFAULT_MAX_PER_SECTOR = 2;

/**
 * Generate a one-month investment portfolio from the candidate universe and the
 * user's request. Allocation is proportional to each holding's score; whole
 * shares are bought at the latest quote, and the un-deployable remainder is
 * returned as leftover cash.
 *
 * `durationYears` is captured on the request but only drives the projection
 * engines (Phase 5), not this month's allocation.
 */
export function generatePortfolio(
  universe: CompanyData[],
  request: PortfolioRequest,
  now: Date = new Date()
): Portfolio {
  const candidates = filterUniverse(universe, request.filters, request.index);

  const scored = scoreUniverse(candidates, {
    strategy: request.strategy,
    riskLevel: request.riskLevel,
  });

  const selected = selectHoldings(scored, {
    count: request.holdingsCount ?? DEFAULT_COUNT,
    maxPerSector: request.maxPerSector ?? DEFAULT_MAX_PER_SECTOR,
  });

  const bySymbol = new Map(universe.map((d) => [d.company.symbol, d]));
  const totalScore = selected.reduce((sum, sc) => sum + sc.score, 0);

  const holdings: PortfolioHolding[] = selected.map((sc) => {
    const weight = totalScore > 0 ? sc.score / totalScore : 1 / selected.length;
    const targetAmount = request.monthlyInvestmentAmount * weight;
    const price = bySymbol.get(sc.company.symbol)?.quote?.price ?? 0;
    const shares = price > 0 ? Math.floor(targetAmount / price) : 0;
    const cost = Math.round(shares * price * 100) / 100;
    return {
      symbol: sc.company.symbol,
      companyName: sc.company.companyName,
      sector: sc.company.sector,
      score: sc.score,
      allocationPercent: Math.round(weight * 10000) / 100,
      targetAmount: Math.round(targetAmount * 100) / 100,
      price,
      shares,
      cost,
    };
  });

  const investedThisMonth = Math.round(holdings.reduce((s, h) => s + h.cost, 0) * 100) / 100;
  const leftoverCash =
    Math.round((request.monthlyInvestmentAmount - investedThisMonth) * 100) / 100;

  return {
    request,
    holdings,
    investedThisMonth,
    leftoverCash,
    generatedAt: now.toISOString(),
  };
}
