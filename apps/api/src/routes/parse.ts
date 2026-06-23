import type { Index, PortfolioFilters, PortfolioRequest, RiskLevel, Strategy } from '@psx/shared';

const STRATEGIES: Strategy[] = ['dividend', 'growth', 'balanced'];
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];
const INDEXES: Index[] = ['KMI30', 'KMI100'];

interface ParseResult {
  request?: PortfolioRequest;
  error?: string;
}

/** Validate and normalize a portfolio request body. */
export function parsePortfolioRequest(body: unknown): ParseResult {
  if (typeof body !== 'object' || body === null) return { error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;

  const amount = Number(b.monthlyInvestmentAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'monthlyInvestmentAmount must be a positive number' };
  }
  const durationYears = Number(b.durationYears);
  if (!Number.isFinite(durationYears) || durationYears <= 0) {
    return { error: 'durationYears must be a positive number' };
  }
  if (!STRATEGIES.includes(b.strategy as Strategy)) {
    return { error: `strategy must be one of ${STRATEGIES.join(', ')}` };
  }
  if (!RISK_LEVELS.includes(b.riskLevel as RiskLevel)) {
    return { error: `riskLevel must be one of ${RISK_LEVELS.join(', ')}` };
  }
  if (b.index !== undefined && !INDEXES.includes(b.index as Index)) {
    return { error: `index must be one of ${INDEXES.join(', ')}` };
  }

  const request: PortfolioRequest = {
    monthlyInvestmentAmount: amount,
    durationYears,
    strategy: b.strategy as Strategy,
    riskLevel: b.riskLevel as RiskLevel,
  };
  if (b.index !== undefined) request.index = b.index as Index;
  if (b.holdingsCount !== undefined) {
    const n = Number(b.holdingsCount);
    if (!Number.isInteger(n) || n < 1 || n > 30) {
      return { error: 'holdingsCount must be an integer between 1 and 30' };
    }
    request.holdingsCount = n;
  }
  if (b.maxPerSector !== undefined) {
    const n = Number(b.maxPerSector);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return { error: 'maxPerSector must be an integer between 1 and 10' };
    }
    request.maxPerSector = n;
  }
  if (b.filters !== undefined) {
    const parsed = parseFilters(b.filters);
    if (parsed.error) return { error: parsed.error };
    request.filters = parsed.filters;
  }
  return { request };
}

type NumericFilterKey =
  | 'minDividendYield'
  | 'minEpsGrowth'
  | 'minRevenueGrowth'
  | 'maxDebtRatio'
  | 'maxVolatility';

// Each financial filter is a fraction in a sane band (e.g. 0.05 = 5%).
const FRACTION_FIELDS: { key: NumericFilterKey; min: number; max: number }[] = [
  { key: 'minDividendYield', min: 0, max: 1 },
  { key: 'minEpsGrowth', min: -1, max: 5 },
  { key: 'minRevenueGrowth', min: -1, max: 5 },
  { key: 'maxDebtRatio', min: 0, max: 1 },
  { key: 'maxVolatility', min: 0, max: 5 },
];

function parseFilters(input: unknown): { filters?: PortfolioFilters; error?: string } {
  if (typeof input !== 'object' || input === null) return { error: 'filters must be an object' };
  const f = input as Record<string, unknown>;
  const filters: PortfolioFilters = {};

  if (f.shariahOnly !== undefined) {
    if (typeof f.shariahOnly !== 'boolean')
      return { error: 'filters.shariahOnly must be a boolean' };
    filters.shariahOnly = f.shariahOnly;
  }
  for (const { key, min, max } of FRACTION_FIELDS) {
    if (f[key] === undefined) continue;
    const n = Number(f[key]);
    if (!Number.isFinite(n) || n < min || n > max) {
      return { error: `filters.${key} must be a number between ${min} and ${max}` };
    }
    filters[key] = n;
  }
  return { filters };
}
