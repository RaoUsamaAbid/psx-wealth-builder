import type {
  CompanyData,
  CurrentHolding,
  PortfolioRequest,
  RebalanceAction,
  RebalanceActionType,
  RebalanceResult,
} from '@psx/shared';
import { generatePortfolio } from './portfolio.js';
import { scoreUniverse } from './scoring.js';
import { filterUniverse } from './filters.js';
import { dividendCagr } from './scoring.js';

/**
 * Rebalancing engine. Compares the user's CURRENT holdings against the ideal
 * target portfolio for their strategy, and emits per-position actions:
 *   - hold      within tolerance of target
 *   - increase  underweight vs target (or a target name not yet held → add)
 *   - reduce    overweight vs target, or sector-concentrated
 *   - replace   not in the ideal set / untracked / dividend-deteriorating,
 *               paired with a suggested better symbol
 *
 * Detects: overweight positions, sector concentration, dividend deterioration,
 * and better opportunities (high-scoring names not currently held).
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;
const DEFAULT_BAND = 5; // percentage points
const SECTOR_CONCENTRATION = 40; // % of portfolio in one sector

export interface RebalanceOptions {
  band?: number;
}

export function generateRebalance(
  universe: CompanyData[],
  request: PortfolioRequest,
  current: CurrentHolding[],
  opts: RebalanceOptions = {}
): Omit<RebalanceResult, 'request'> {
  const band = opts.band ?? DEFAULT_BAND;
  const bySymbol = new Map(universe.map((d) => [d.company.symbol, d]));

  // Current value + weights.
  const valued = current.map((c) => {
    const d = bySymbol.get(c.symbol);
    const price = d?.quote?.price ?? 0;
    return { c, d, value: c.shares * price };
  });
  const currentValue = valued.reduce((s, v) => s + v.value, 0) || 0;
  const weightOf = (value: number): number => (currentValue > 0 ? (value / currentValue) * 100 : 0);

  // Current sector weights (for concentration detection).
  const sectorWeight = new Map<string, number>();
  for (const v of valued) {
    const sector = v.d?.company.sector ?? 'Unknown';
    sectorWeight.set(sector, (sectorWeight.get(sector) ?? 0) + weightOf(v.value));
  }

  // Ideal target + strategy scores.
  const target = generatePortfolio(universe, request);
  const targetWeight = new Map(target.holdings.map((h) => [h.symbol, h.allocationPercent]));
  const scored = scoreUniverse(filterUniverse(universe, request.filters, request.index), {
    strategy: request.strategy,
    riskLevel: request.riskLevel,
  });
  const scoreMap = new Map(scored.map((s) => [s.company.symbol, s.score]));

  const currentSymbols = new Set(current.map((c) => c.symbol));
  // Replacement pool: ranked target names not currently held.
  const replacePool = target.holdings
    .filter((h) => !currentSymbols.has(h.symbol))
    .map((h) => h.symbol);
  let poolIdx = 0;
  const consumed = new Set<string>();
  const nextReplacement = (): string | undefined => {
    const sym = replacePool[poolIdx++];
    if (sym) consumed.add(sym);
    return sym;
  };

  const actions: RebalanceAction[] = [];

  // 1) Evaluate every current holding.
  for (const v of valued) {
    const symbol = v.c.symbol;
    const meta = v.d?.company;
    const cWeight = round2(weightOf(v.value));
    const tWeight = targetWeight.get(symbol) ?? 0;
    const score = scoreMap.get(symbol) ?? 0;
    const reasons: string[] = [];
    let action: RebalanceActionType;
    let replaceWith: string | undefined;

    const divDeteriorating = v.d ? dividendCagr(v.d.dividends) < 0 : false;
    if (divDeteriorating) reasons.push('Dividend deterioration (negative DPS growth).');

    if (!v.d) {
      action = 'replace';
      replaceWith = nextReplacement();
      reasons.push('Not in the tracked universe.');
    } else if (tWeight === 0) {
      // Not in the ideal set for this strategy.
      replaceWith = nextReplacement();
      action = replaceWith ? 'replace' : 'reduce';
      reasons.push('Not in the ideal set for this strategy.');
    } else {
      const diff = cWeight - tWeight;
      if (diff > band) {
        action = 'reduce';
        reasons.push(`Overweight by ${round2(diff)}pp vs target.`);
      } else if (diff < -band) {
        action = 'increase';
        reasons.push(`Underweight by ${round2(-diff)}pp vs target.`);
      } else {
        action = 'hold';
        reasons.push('Within tolerance of target weight.');
      }
    }

    // Sector concentration override.
    const sector = meta?.sector ?? 'Unknown';
    const secW = sectorWeight.get(sector) ?? 0;
    if (secW > SECTOR_CONCENTRATION) {
      reasons.push(`Sector concentration: ${round2(secW)}% in ${sector}.`);
      if (action === 'increase' || action === 'hold') action = 'reduce';
    }
    // Dividend deterioration biases toward trimming.
    if (divDeteriorating && action === 'hold') action = 'reduce';

    actions.push({
      symbol,
      companyName: meta?.companyName ?? symbol,
      sector,
      action,
      currentWeight: cWeight,
      targetWeight: round2(tWeight),
      currentValue: round2(v.value),
      score,
      replaceWith,
      reasons,
    });
  }

  // 2) Better opportunities: target names not currently held → add.
  for (const h of target.holdings) {
    if (currentSymbols.has(h.symbol) || consumed.has(h.symbol)) continue; // already a replace target
    actions.push({
      symbol: h.symbol,
      companyName: h.companyName,
      sector: h.sector,
      action: 'increase',
      currentWeight: 0,
      targetWeight: round2(h.allocationPercent),
      currentValue: 0,
      score: scoreMap.get(h.symbol) ?? 0,
      reasons: ['Not yet held — strong candidate, add toward target weight.'],
    });
  }

  const summary: Record<RebalanceActionType, number> = {
    hold: 0,
    increase: 0,
    reduce: 0,
    replace: 0,
  };
  for (const a of actions) summary[a.action]++;

  return { currentValue: round2(currentValue), band, actions, summary };
}
