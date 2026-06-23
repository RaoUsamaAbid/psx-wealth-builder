import type {
  CompanyData,
  Dividend,
  RiskLevel,
  ScoreFeatures,
  ScoredCompany,
  Strategy,
} from '@psx/shared';

/**
 * Scoring engine. Turns each company's fundamentals into a 0..100 score for a
 * given strategy + risk level. Scores are RELATIVE to the supplied universe
 * (min-max normalized), so always score the full candidate set together.
 */

type FeatureWeights = Record<keyof ScoreFeatures, number>;

const STRATEGY_WEIGHTS: Record<Strategy, FeatureWeights> = {
  dividend: {
    yield: 0.32,
    dividendGrowth: 0.2,
    roe: 0.1,
    value: 0.1,
    lowDebt: 0.15,
    lowBeta: 0.1,
    epsGrowth: 0.02,
    revenueGrowth: 0.01,
  },
  growth: {
    epsGrowth: 0.3,
    revenueGrowth: 0.24,
    roe: 0.2,
    value: 0.1,
    lowBeta: 0.06,
    lowDebt: 0.05,
    yield: 0.03,
    dividendGrowth: 0.02,
  },
  balanced: {
    yield: 0.16,
    dividendGrowth: 0.12,
    epsGrowth: 0.16,
    revenueGrowth: 0.1,
    roe: 0.15,
    value: 0.12,
    lowBeta: 0.09,
    lowDebt: 0.1,
  },
};

/** Annualized dividend-per-share growth from history (fraction). */
export function dividendCagr(dividends: Dividend[]): number {
  if (dividends.length < 2) return 0;
  const sorted = [...dividends].sort((a, b) => a.year - b.year);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const span = last.year - first.year;
  if (span <= 0 || first.amountPerShare <= 0 || last.amountPerShare <= 0) return 0;
  return (last.amountPerShare / first.amountPerShare) ** (1 / span) - 1;
}

interface RawMetrics {
  data: CompanyData;
  yield: number;
  dividendGrowth: number;
  epsGrowth: number;
  revenueGrowth: number;
  roe: number;
  pe: number;
  beta: number;
  debt: number;
}

function minMax(values: number[]): (v: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return (v: number) => (span === 0 ? 0.5 : (v - min) / span);
}

function riskMultiplier(level: RiskLevel, f: ScoreFeatures): number {
  // lowBeta/lowDebt are 1 = safest. Riskiness = how far from safe.
  const riskiness = 1 - (f.lowBeta + f.lowDebt) / 2;
  const growthiness = (f.epsGrowth + f.revenueGrowth) / 2;
  switch (level) {
    case 'low':
      return 1 - 0.3 * riskiness; // penalize volatile/levered names
    case 'high':
      return 1 + 0.15 * growthiness; // reward growth, tolerate risk
    default:
      return 1;
  }
}

export interface ScoreOptions {
  strategy: Strategy;
  riskLevel: RiskLevel;
}

/** Score every company with usable fundamentals + quote, relative to the set. */
export function scoreUniverse(universe: CompanyData[], opts: ScoreOptions): ScoredCompany[] {
  const usable: RawMetrics[] = universe
    .filter((d) => d.fundamentals != null && d.quote != null)
    .map((d) => {
      const f = d.fundamentals!;
      return {
        data: d,
        yield: f.dividendYield,
        dividendGrowth: dividendCagr(d.dividends),
        epsGrowth: f.epsGrowth,
        revenueGrowth: f.revenueGrowth,
        roe: f.roe,
        pe: f.peRatio,
        beta: f.beta,
        debt: f.debtRatio,
      };
    });

  if (usable.length === 0) return [];

  const nYield = minMax(usable.map((m) => m.yield));
  const nDivG = minMax(usable.map((m) => m.dividendGrowth));
  const nEps = minMax(usable.map((m) => m.epsGrowth));
  const nRev = minMax(usable.map((m) => m.revenueGrowth));
  const nRoe = minMax(usable.map((m) => m.roe));
  const nPe = minMax(usable.map((m) => m.pe));
  const nBeta = minMax(usable.map((m) => m.beta));
  const nDebt = minMax(usable.map((m) => m.debt));

  const weights = STRATEGY_WEIGHTS[opts.strategy];

  return usable
    .map((m) => {
      const features: ScoreFeatures = {
        yield: nYield(m.yield),
        dividendGrowth: nDivG(m.dividendGrowth),
        epsGrowth: nEps(m.epsGrowth),
        revenueGrowth: nRev(m.revenueGrowth),
        roe: nRoe(m.roe),
        value: 1 - nPe(m.pe), // cheaper P/E scores higher
        lowBeta: 1 - nBeta(m.beta),
        lowDebt: 1 - nDebt(m.debt),
      };
      const base = (Object.keys(weights) as (keyof ScoreFeatures)[]).reduce(
        (sum, k) => sum + features[k] * weights[k],
        0
      );
      const score = Math.max(
        0,
        Math.min(100, 100 * base * riskMultiplier(opts.riskLevel, features))
      );
      return { company: m.data.company, score: Math.round(score * 100) / 100, features };
    })
    .sort((a, b) => b.score - a.score);
}
