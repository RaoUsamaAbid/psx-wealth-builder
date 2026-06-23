import type { Index, PortfolioRequest, RiskLevel, Strategy } from '@psx/shared';

const STRATEGIES: Strategy[] = ['dividend', 'growth', 'balanced'];
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];
const INDEXES: Index[] = ['KMI30', 'KMI100'];

export interface ParseResult {
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
  return { request };
}
