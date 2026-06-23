import type {
  CompanyData,
  HealthComponents,
  HealthGrade,
  HealthScore,
  Portfolio,
} from '@psx/shared';
import { dividendCagr } from './scoring.js';

/**
 * Portfolio health score (0..100) from five components: diversification, risk,
 * dividend strength, growth potential, and sector exposure. Component scores are
 * combined with fixed weights; metrics and human-readable notes are returned so
 * the result is transparent (Core Principle: data transparency).
 *
 * All aggregates are weighted by each holding's allocation percentage.
 */

const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));
const round = (n: number, dp = 2): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const COMPONENT_WEIGHTS: Record<keyof HealthComponents, number> = {
  diversification: 0.2,
  risk: 0.25,
  dividendStrength: 0.2,
  growthPotential: 0.2,
  sectorExposure: 0.15,
};

function gradeFor(score: number): HealthGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'E';
}

export function scorePortfolioHealth(portfolio: Portfolio, universe: CompanyData[]): HealthScore {
  const bySymbol = new Map(universe.map((d) => [d.company.symbol, d]));
  const holdings = portfolio.holdings;

  if (holdings.length === 0) {
    const zero: HealthComponents = {
      diversification: 0,
      risk: 0,
      dividendStrength: 0,
      growthPotential: 0,
      sectorExposure: 0,
    };
    return {
      score: 0,
      grade: 'E',
      components: zero,
      metrics: {
        holdings: 0,
        effectiveHoldings: 0,
        sectorCount: 0,
        topSector: '',
        topSectorWeight: 0,
        portfolioBeta: 0,
        portfolioDebtRatio: 0,
        portfolioDividendYield: 0,
        portfolioEpsGrowth: 0,
      },
      notes: ['Portfolio is empty — no holdings matched the inputs/filters.'],
    };
  }

  // Normalize weights (guard against rounding so they sum to 1).
  const totalPct = holdings.reduce((s, h) => s + h.allocationPercent, 0) || 1;
  const weighted = holdings.map((h) => ({ h, w: h.allocationPercent / totalPct }));

  // Concentration (Herfindahl) of position weights.
  const hhi = weighted.reduce((s, { w }) => s + w * w, 0);
  const effectiveHoldings = hhi > 0 ? 1 / hhi : 0;

  // Sector weights.
  const sectorWeight = new Map<string, number>();
  for (const { h, w } of weighted) {
    sectorWeight.set(h.sector, (sectorWeight.get(h.sector) ?? 0) + w);
  }
  const sectorHhi = [...sectorWeight.values()].reduce((s, w) => s + w * w, 0);
  const effectiveSectors = sectorHhi > 0 ? 1 / sectorHhi : 0;
  const [topSector, topSectorW] = [...sectorWeight.entries()].reduce((a, b) =>
    b[1] > a[1] ? b : a
  );

  // Fundamentals-weighted aggregates.
  let beta = 0;
  let debt = 0;
  let yield_ = 0;
  let divGrowth = 0;
  let eps = 0;
  let rev = 0;
  let roe = 0;
  for (const { h, w } of weighted) {
    const d = bySymbol.get(h.symbol);
    const f = d?.fundamentals;
    if (f) {
      beta += w * f.beta;
      debt += w * f.debtRatio;
      yield_ += w * f.dividendYield;
      eps += w * f.epsGrowth;
      rev += w * f.revenueGrowth;
      roe += w * f.roe;
    }
    if (d) divGrowth += w * dividendCagr(d.dividends);
  }

  const components: HealthComponents = {
    // 10 equally weighted names → ~100.
    diversification: clamp100((effectiveHoldings / 10) * 100),
    // beta 0.7→100, 1.5→0; debt 0→100, 0.6→0.
    risk: clamp100(
      0.6 * clamp100(100 - ((beta - 0.7) / 0.8) * 100) + 0.4 * clamp100(100 - (debt / 0.6) * 100)
    ),
    // yield 10%→100, divGrowth 12%→100.
    dividendStrength: clamp100(
      0.6 * clamp100((yield_ / 0.1) * 100) + 0.4 * clamp100((divGrowth / 0.12) * 100)
    ),
    // eps 25%→100, rev 25%→100, roe 30%→100.
    growthPotential: clamp100(
      0.4 * clamp100((eps / 0.25) * 100) +
        0.3 * clamp100((rev / 0.25) * 100) +
        0.3 * clamp100((roe / 0.3) * 100)
    ),
    // ~5 effective sectors → 100.
    sectorExposure: clamp100((effectiveSectors / 5) * 100),
  };

  const score = (Object.keys(COMPONENT_WEIGHTS) as (keyof HealthComponents)[]).reduce(
    (s, k) => s + components[k] * COMPONENT_WEIGHTS[k],
    0
  );

  const notes: string[] = [];
  if (effectiveHoldings < 5) notes.push('Concentrated — few effective holdings.');
  if (topSectorW > 0.4)
    notes.push(`High sector concentration: ${round(topSectorW * 100)}% in ${topSector}.`);
  if (beta > 1.2) notes.push('Elevated volatility (portfolio beta > 1.2).');
  if (debt > 0.45) notes.push('High average leverage (debt ratio > 0.45).');
  if (yield_ < 0.04) notes.push('Low dividend yield (< 4%).');
  if (components.growthPotential < 35) notes.push('Limited growth potential.');
  if (notes.length === 0) notes.push('Well-balanced across all health dimensions.');

  return {
    score: round(score),
    grade: gradeFor(score),
    components: {
      diversification: round(components.diversification),
      risk: round(components.risk),
      dividendStrength: round(components.dividendStrength),
      growthPotential: round(components.growthPotential),
      sectorExposure: round(components.sectorExposure),
    },
    metrics: {
      holdings: holdings.length,
      effectiveHoldings: round(effectiveHoldings),
      sectorCount: sectorWeight.size,
      topSector,
      topSectorWeight: round(topSectorW * 100),
      portfolioBeta: round(beta),
      portfolioDebtRatio: round(debt, 4),
      portfolioDividendYield: round(yield_, 4),
      portfolioEpsGrowth: round(eps, 4),
    },
    notes,
  };
}
