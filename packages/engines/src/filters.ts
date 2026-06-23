import type { CompanyData, Index, PortfolioFilters } from '@psx/shared';

/**
 * Universe filters. Index/Shariah are eligibility gates; the financial filters
 * are quality thresholds on fundamentals. A company with no fundamentals is
 * excluded as soon as ANY financial filter is active (it can't be evaluated).
 */
export function filterUniverse(
  universe: CompanyData[],
  filters: PortfolioFilters | undefined,
  index?: Index
): CompanyData[] {
  return universe.filter((d) => {
    if (index && !d.company.indices.includes(index)) return false;
    if (!filters) return true;

    if (filters.shariahOnly && !d.company.shariahCompliant) return false;

    const hasFinancialFilter =
      filters.minDividendYield != null ||
      filters.minEpsGrowth != null ||
      filters.minRevenueGrowth != null ||
      filters.maxDebtRatio != null ||
      filters.maxVolatility != null;

    if (!hasFinancialFilter) return true;

    const f = d.fundamentals;
    if (!f) return false; // cannot evaluate quality without fundamentals

    if (filters.minDividendYield != null && f.dividendYield < filters.minDividendYield)
      return false;
    if (filters.minEpsGrowth != null && f.epsGrowth < filters.minEpsGrowth) return false;
    if (filters.minRevenueGrowth != null && f.revenueGrowth < filters.minRevenueGrowth)
      return false;
    if (filters.maxDebtRatio != null && f.debtRatio > filters.maxDebtRatio) return false;
    if (filters.maxVolatility != null && f.beta > filters.maxVolatility) return false;

    return true;
  });
}
