import { describe, it, expect } from 'vitest';
import type { Dividend } from '@psx/shared';
import { scoreUniverse, dividendCagr, selectHoldings } from '@psx/engines';
import { makeUniverse } from './helpers';

const universe = makeUniverse();

describe('scoreUniverse', () => {
  it('ranks high-yield names top for the dividend strategy', () => {
    const scored = scoreUniverse(universe, { strategy: 'dividend', riskLevel: 'low' });
    const top3 = scored.slice(0, 3).map((s) => s.company.symbol);
    // FERT1/FERT2/BANK1/POWER1 are the income archetypes
    expect(top3.some((s) => ['FERT1', 'FERT2', 'BANK1', 'POWER1'].includes(s))).toBe(true);
    expect(top3).not.toContain('TECH1');
  });

  it('ranks high-growth tech top for the growth strategy', () => {
    const scored = scoreUniverse(universe, { strategy: 'growth', riskLevel: 'high' });
    const top2 = scored.slice(0, 2).map((s) => s.company.symbol);
    expect(top2).toContain('TECH1');
  });

  it('produces scores in [0,100] sorted descending', () => {
    const scored = scoreUniverse(universe, { strategy: 'balanced', riskLevel: 'medium' });
    for (const s of scored) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1]!.score).toBeGreaterThanOrEqual(scored[i]!.score);
    }
  });

  it('returns [] when no company has fundamentals', () => {
    const stripped = universe.map((d) => ({ ...d, fundamentals: null }));
    expect(scoreUniverse(stripped, { strategy: 'balanced', riskLevel: 'medium' })).toEqual([]);
  });

  it('low risk penalizes high-beta names vs high risk', () => {
    const cem = (riskLevel: 'low' | 'high') =>
      scoreUniverse(universe, { strategy: 'balanced', riskLevel }).find(
        (s) => s.company.symbol === 'CEM1'
      )!.score;
    expect(cem('low')).toBeLessThan(cem('high'));
  });
});

describe('dividendCagr', () => {
  it('computes annualized growth from history', () => {
    const divs: Dividend[] = [
      { symbol: 'X', year: 2021, amountPerShare: 10, payoutRatio: 0.5 },
      { symbol: 'X', year: 2025, amountPerShare: 16, payoutRatio: 0.5 },
    ];
    // (16/10)^(1/4) - 1 ≈ 0.1247
    expect(dividendCagr(divs)).toBeCloseTo(0.1247, 3);
  });
  it('returns 0 for insufficient or invalid history', () => {
    expect(dividendCagr([])).toBe(0);
    expect(dividendCagr([{ symbol: 'X', year: 2025, amountPerShare: 5, payoutRatio: 0.5 }])).toBe(
      0
    );
  });
});

describe('selectHoldings', () => {
  const scored = scoreUniverse(universe, { strategy: 'balanced', riskLevel: 'medium' });

  it('honors count and per-sector cap', () => {
    const picked = selectHoldings(scored, { count: 6, maxPerSector: 2 });
    expect(picked.length).toBe(6);
    const bySector = new Map<string, number>();
    for (const p of picked)
      bySector.set(p.company.sector, (bySector.get(p.company.sector) ?? 0) + 1);
    for (const n of bySector.values()) expect(n).toBeLessThanOrEqual(2);
  });

  it('backfills past the sector cap when needed to reach count', () => {
    // cap of 1 with count 8 forces backfill (12 names, but limited sectors)
    const picked = selectHoldings(scored, { count: 8, maxPerSector: 1 });
    expect(picked.length).toBe(8);
  });
});
