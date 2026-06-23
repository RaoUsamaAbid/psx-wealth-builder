import { describe, it, expect } from 'vitest';
import type { PortfolioRequest, RiskLevel, Strategy } from '@psx/shared';
import { generatePortfolio, projectWealth, scorePortfolioHealth } from '@psx/engines';
import { buildPlan } from './plan';
import { makeUniverse } from './helpers';

const universe = makeUniverse();
const STRATS: Strategy[] = ['dividend', 'growth', 'balanced'];
const RISKS: RiskLevel[] = ['low', 'medium', 'high'];

/**
 * Stress: hammer the hot path (generate → health) across a wide input matrix and
 * assert it stays fast and numerically stable — no NaN/Infinity, allocations
 * always normalize, budgets never overspend.
 */
describe('engine stress', () => {
  it('runs 3000 portfolio generations quickly and stably', () => {
    const start = Date.now();
    let runs = 0;
    for (let i = 0; i < 3000; i++) {
      const req: PortfolioRequest = {
        monthlyInvestmentAmount: 1000 + (i % 50) * 2500,
        durationYears: 1 + (i % 30),
        strategy: STRATS[i % 3]!,
        riskLevel: RISKS[i % 3]!,
        holdingsCount: 3 + (i % 8),
        maxPerSector: 1 + (i % 3),
      };
      const p = generatePortfolio(universe, req);
      const sum = p.holdings.reduce((s, h) => s + h.allocationPercent, 0);
      if (p.holdings.length > 0) {
        expect(sum).toBeGreaterThan(99.4);
        expect(sum).toBeLessThan(100.6);
      }
      expect(Number.isFinite(p.investedThisMonth)).toBe(true);
      expect(p.investedThisMonth).toBeLessThanOrEqual(req.monthlyInvestmentAmount + 0.01);
      for (const h of p.holdings) {
        expect(Number.isFinite(h.shares)).toBe(true);
        expect(Number.isNaN(h.allocationPercent)).toBe(false);
      }
      runs++;
    }
    const ms = Date.now() - start;
    expect(runs).toBe(3000);
    expect(ms).toBeLessThan(8000); // generous headroom; typically well under 2s
  });

  it('projects + scores 500 long-horizon plans without blowing up', () => {
    for (let i = 0; i < 500; i++) {
      const req: PortfolioRequest = {
        monthlyInvestmentAmount: 25000 + i * 10,
        durationYears: 25,
        strategy: STRATS[i % 3]!,
        riskLevel: RISKS[i % 3]!,
        holdingsCount: 8,
        maxPerSector: 2,
      };
      const portfolio = generatePortfolio(universe, req);
      const plan = buildPlan(universe, portfolio);
      const proj = projectWealth(plan, {
        monthlyInvestmentAmount: req.monthlyInvestmentAmount,
        years: 25,
        reinvest: true,
      });
      for (const s of proj.scenarios) {
        expect(Number.isFinite(s.futureValue)).toBe(true);
        expect(s.futureValue).toBeGreaterThan(0);
      }
      const health = scorePortfolioHealth(portfolio, universe);
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    }
  });
});
