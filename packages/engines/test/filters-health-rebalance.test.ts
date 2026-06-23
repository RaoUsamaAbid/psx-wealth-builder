import { describe, it, expect } from 'vitest';
import type { CurrentHolding, PortfolioRequest } from '@psx/shared';
import {
  filterUniverse,
  generatePortfolio,
  scorePortfolioHealth,
  generateRebalance,
} from '@psx/engines';
import { makeUniverse } from './helpers';

const universe = makeUniverse();
const base: PortfolioRequest = {
  monthlyInvestmentAmount: 50000,
  durationYears: 15,
  strategy: 'balanced',
  riskLevel: 'medium',
  holdingsCount: 8,
  maxPerSector: 2,
};

describe('filterUniverse', () => {
  it('gates by index', () => {
    const f = filterUniverse(universe, undefined, 'KMI30');
    expect(f.every((d) => d.company.indices.includes('KMI30'))).toBe(true);
  });
  it('applies financial thresholds', () => {
    const f = filterUniverse(universe, { minDividendYield: 0.1 });
    expect(f.every((d) => d.fundamentals!.dividendYield >= 0.1)).toBe(true);
    expect(f.length).toBeGreaterThan(0);
  });
  it('excludes names without fundamentals once a financial filter is active', () => {
    const withNull = [
      ...universe,
      {
        ...universe[0]!,
        company: { ...universe[0]!.company, symbol: 'NOFUND' },
        fundamentals: null,
      },
    ];
    const f = filterUniverse(withNull, { maxVolatility: 1.5 });
    expect(f.find((d) => d.company.symbol === 'NOFUND')).toBeUndefined();
  });
  it('impossible filter yields empty', () => {
    expect(filterUniverse(universe, { minDividendYield: 0.99 })).toHaveLength(0);
  });
});

describe('scorePortfolioHealth', () => {
  it('scores an empty portfolio 0 / grade E', () => {
    const empty = generatePortfolio(universe, { ...base, filters: { minDividendYield: 0.99 } });
    const h = scorePortfolioHealth(empty, universe);
    expect(h.score).toBe(0);
    expect(h.grade).toBe('E');
  });

  it('a diversified portfolio scores higher diversification than a concentrated one', () => {
    const diversified = scorePortfolioHealth(generatePortfolio(universe, base), universe);
    const concentrated = scorePortfolioHealth(
      generatePortfolio(universe, { ...base, holdingsCount: 2, maxPerSector: 2 }),
      universe
    );
    expect(diversified.components.diversification).toBeGreaterThan(
      concentrated.components.diversification
    );
    expect(diversified.score).toBeGreaterThan(0);
    expect(['A', 'B', 'C', 'D', 'E']).toContain(diversified.grade);
  });

  it('exposes transparent metrics and notes', () => {
    const h = scorePortfolioHealth(generatePortfolio(universe, base), universe);
    expect(h.metrics.holdings).toBeGreaterThan(0);
    expect(h.metrics.effectiveHoldings).toBeGreaterThan(0);
    expect(h.notes.length).toBeGreaterThan(0);
  });
});

describe('generateRebalance', () => {
  const current: CurrentHolding[] = [
    { symbol: 'TECH1', shares: 2000 }, // likely overweight / off a dividend target
    { symbol: 'FERT1', shares: 50 },
  ];

  it('emits every action type appropriately and a consistent summary', () => {
    const r = generateRebalance(universe, { ...base, strategy: 'dividend' }, current, { band: 5 });
    const types = new Set(r.actions.map((a) => a.action));
    // additions for unheld target names → increase
    expect(types.has('increase')).toBe(true);
    const total = r.summary.hold + r.summary.increase + r.summary.reduce + r.summary.replace;
    expect(total).toBe(r.actions.length);
    expect(r.currentValue).toBeGreaterThan(0);
  });

  it('does not double-suggest a replacement target as a separate add', () => {
    const r = generateRebalance(universe, { ...base, strategy: 'dividend' }, current, { band: 5 });
    const replaceTargets = r.actions.filter((a) => a.replaceWith).map((a) => a.replaceWith);
    const increases = r.actions.filter((a) => a.action === 'increase').map((a) => a.symbol);
    for (const t of replaceTargets) expect(increases).not.toContain(t);
  });
});
