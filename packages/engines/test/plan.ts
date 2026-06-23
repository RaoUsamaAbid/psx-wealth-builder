import type { CompanyData, DividendPlanPosition, Portfolio } from '@psx/shared';
import { dividendPlanFromPortfolio, dividendCagr } from '@psx/engines';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Test-side builder mirroring the API's buildDividendPlan. */
export function buildPlan(universe: CompanyData[], portfolio: Portfolio): DividendPlanPosition[] {
  const bySymbol = new Map(universe.map((d) => [d.company.symbol, d]));
  return dividendPlanFromPortfolio(portfolio, (symbol) => {
    const d = bySymbol.get(symbol);
    const latestDps =
      d && d.dividends.length > 0
        ? d.dividends.reduce((a, b) => (b.year > a.year ? b : a)).amountPerShare
        : 0;
    return {
      expectedAnnualReturn: clamp(d?.fundamentals?.epsGrowth ?? 0, -0.1, 0.3),
      startDps: latestDps,
      dividendGrowth: clamp(d ? dividendCagr(d.dividends) : 0, 0, 0.25),
    };
  });
}
