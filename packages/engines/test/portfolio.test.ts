import { describe, it, expect } from 'vitest';
import type { PortfolioRequest } from '@psx/shared';
import { generatePortfolio } from '@psx/engines';
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

describe('generatePortfolio', () => {
  it('allocations sum to ~100% and respect holdings count + sector cap', () => {
    const p = generatePortfolio(universe, base);
    expect(p.holdings.length).toBeLessThanOrEqual(8);
    const sum = p.holdings.reduce((s, h) => s + h.allocationPercent, 0);
    expect(sum).toBeGreaterThan(99.5);
    expect(sum).toBeLessThan(100.5);
    const bySector = new Map<string, number>();
    for (const h of p.holdings) bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + 1);
    for (const n of bySector.values()) expect(n).toBeLessThanOrEqual(2);
  });

  it('buys whole shares and never overspends the monthly budget', () => {
    const p = generatePortfolio(universe, base);
    for (const h of p.holdings) {
      expect(Number.isInteger(h.shares)).toBe(true);
      expect(h.cost).toBeCloseTo(h.shares * h.price, 2);
    }
    expect(p.investedThisMonth).toBeLessThanOrEqual(base.monthlyInvestmentAmount + 0.01);
    expect(p.leftoverCash).toBeGreaterThanOrEqual(-0.01);
    expect(p.investedThisMonth + p.leftoverCash).toBeCloseTo(base.monthlyInvestmentAmount, 0);
  });

  it('restricts the universe by index', () => {
    const p = generatePortfolio(universe, { ...base, index: 'KMI30', holdingsCount: 10 });
    // Only KMI30 names in the helper universe
    const kmi30 = new Set(['FERT1', 'BANK1', 'TECH1', 'CEM1', 'OIL1']);
    for (const h of p.holdings) expect(kmi30.has(h.symbol)).toBe(true);
  });

  it('returns an empty portfolio when nothing matches', () => {
    const p = generatePortfolio(universe, {
      ...base,
      filters: { minDividendYield: 0.99 },
    });
    expect(p.holdings).toHaveLength(0);
    expect(p.investedThisMonth).toBe(0);
  });

  it('allocation is deterministic for the same inputs', () => {
    const a = generatePortfolio(universe, base);
    const b = generatePortfolio(universe, base);
    expect(a.holdings.map((h) => h.symbol)).toEqual(b.holdings.map((h) => h.symbol));
  });
});
