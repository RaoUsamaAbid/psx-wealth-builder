import type { CompanyData, DividendPlanPosition, Portfolio } from '@psx/shared';
import { dividendPlanFromPortfolio } from '@psx/engines';

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Latest dividend-per-share from a company's history (most recent year). */
function latestDps(d: CompanyData): number {
  if (d.dividends.length === 0) return 0;
  return d.dividends.reduce((a, b) => (b.year > a.year ? b : a)).amountPerShare;
}

/**
 * Build a dividend/wealth plan from a generated portfolio + the universe.
 * The price-return assumption is EPS growth floored at 0 — a long-term path is
 * never modelled as a perpetual decline (the real, possibly-negative EPS growth
 * still drives scoring, just not the multi-decade price projection).
 */
export function buildDividendPlan(
  universe: CompanyData[],
  portfolio: Portfolio
): DividendPlanPosition[] {
  const bySymbol = new Map(universe.map((d) => [d.company.symbol, d]));
  return dividendPlanFromPortfolio(portfolio, (symbol) => {
    const d = bySymbol.get(symbol);
    return {
      expectedAnnualReturn: clamp(d?.fundamentals?.epsGrowth ?? 0, 0, 0.3),
      startDps: d ? latestDps(d) : 0,
    };
  });
}
