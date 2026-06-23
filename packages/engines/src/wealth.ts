import type {
  DividendPlanPosition,
  ScenarioName,
  WealthProjection,
  WealthScenarioResult,
} from '@psx/shared';
import { forecastDividends } from './dividend.js';

/**
 * Wealth projection engine. Runs the dividend/SIP simulation under three
 * scenarios that scale each holding's expected price return, and reports the
 * long-term outcome: total invested, future value, cumulative dividends,
 * money-weighted CAGR (IRR), and the retirement dividend run-rate.
 *
 * Only price return is scaled per scenario; dividend growth is held constant
 * (dividends are the more stable input). An optional linear target solver
 * answers "what monthly contribution reaches PKR X?".
 */

export const SCENARIO_FACTORS: Record<ScenarioName, number> = {
  conservative: 0.6,
  base: 1.0,
  optimistic: 1.4,
};

const clampReturn = (r: number): number => Math.max(-0.5, Math.min(0.5, r));

/** Money-weighted annualized return from level annual contributions → FV. */
export function annualizedIrr(
  annualContribution: number,
  futureValue: number,
  years: number
): number | null {
  if (years <= 0 || annualContribution <= 0 || futureValue <= 0) return null;
  const npv = (r: number): number => {
    let acc = futureValue / (1 + r) ** years;
    for (let t = 1; t <= years; t++) acc -= annualContribution / (1 + r) ** t;
    return acc;
  };
  let lo = -0.95;
  let hi = 5;
  let nLo = npv(lo);
  let nHi = npv(hi);
  if (nLo === 0) return lo;
  if (nHi === 0) return hi;
  if (nLo * nHi > 0) return null; // no sign change in range
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const nMid = npv(mid);
    if (Math.abs(nMid) < 1e-6) return mid;
    if (nLo * nMid < 0) {
      hi = mid;
      nHi = nMid;
    } else {
      lo = mid;
      nLo = nMid;
    }
  }
  return (lo + hi) / 2;
}

function projectScenario(
  plan: DividendPlanPosition[],
  scenario: ScenarioName,
  opts: { monthlyInvestmentAmount: number; years: number; reinvest: boolean }
): WealthScenarioResult {
  const factor = SCENARIO_FACTORS[scenario];
  const scaledPlan: DividendPlanPosition[] = plan.map((p) => ({
    ...p,
    expectedAnnualReturn: clampReturn(p.expectedAnnualReturn * factor),
  }));

  const f = forecastDividends(scaledPlan, {
    monthlyInvestmentAmount: opts.monthlyInvestmentAmount,
    years: opts.years,
    reinvest: opts.reinvest,
  });

  const irr = annualizedIrr(opts.monthlyInvestmentAmount * 12, f.finalValue, opts.years);

  return {
    scenario,
    returnFactor: factor,
    totalInvested: f.totalContributed,
    futureValue: f.finalValue,
    totalDividends: f.totalDividends,
    totalReturnPercent:
      f.totalContributed > 0
        ? Math.round(((f.finalValue - f.totalContributed) / f.totalContributed) * 10000) / 100
        : 0,
    cagrPercent: irr == null ? null : Math.round(irr * 10000) / 100,
    finalShares: f.finalShares,
    finalAnnualDividendIncome: f.finalAnnualDividendIncome,
    finalMonthlyDividendIncome: f.finalMonthlyDividendIncome,
    perYear: f.perYear,
  };
}

export interface WealthOptions {
  monthlyInvestmentAmount: number;
  years: number;
  reinvest: boolean;
  targetValue?: number; // optional: solve required monthly to reach this FV
}

export function projectWealth(
  plan: DividendPlanPosition[],
  opts: WealthOptions
): Omit<WealthProjection, 'request'> {
  const scenarios: WealthScenarioResult[] = (
    ['conservative', 'base', 'optimistic'] as ScenarioName[]
  ).map((s) => projectScenario(plan, s, opts));

  const base = scenarios.find((s) => s.scenario === 'base')!;
  let targetSolve: WealthProjection['targetSolve'] = null;
  if (opts.targetValue && opts.targetValue > 0 && base.futureValue > 0) {
    // Model is ~linear in contribution size; scale the base monthly accordingly.
    const required = (opts.monthlyInvestmentAmount * opts.targetValue) / base.futureValue;
    targetSolve = {
      targetValue: opts.targetValue,
      requiredMonthlyInvestment: Math.round(required * 100) / 100,
      basedOn: 'base',
    };
  }

  return { years: opts.years, reinvest: opts.reinvest, scenarios, targetSolve };
}
