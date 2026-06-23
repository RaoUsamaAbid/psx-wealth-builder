import { describe, it, expect } from 'vitest';
import type { DividendPlanPosition, SipPlanPosition } from '@psx/shared';
import { simulateSip, forecastDividends } from '@psx/engines';

const sipPlan: SipPlanPosition[] = [
  {
    symbol: 'A',
    companyName: 'A',
    sector: 'X',
    allocationPercent: 60,
    startPrice: 100,
    expectedAnnualReturn: 0.1,
  },
  {
    symbol: 'B',
    companyName: 'B',
    sector: 'Y',
    allocationPercent: 40,
    startPrice: 50,
    expectedAnnualReturn: 0.1,
  },
];

describe('simulateSip', () => {
  it('contributes exactly monthly*months', () => {
    const r = simulateSip(sipPlan, { monthlyInvestmentAmount: 30000, months: 120 });
    expect(r.totalContributed).toBe(30000 * 120);
    expect(r.timeline).toHaveLength(120);
  });

  it('flat (0%) return → value ≈ invested', () => {
    const flat = sipPlan.map((p) => ({ ...p, expectedAnnualReturn: 0 }));
    const r = simulateSip(flat, { monthlyInvestmentAmount: 30000, months: 24 });
    expect(r.totalValue).toBeCloseTo(r.totalInvested, 0);
    expect(r.totalGainPercent).toBeCloseTo(0, 5);
  });

  it('positive return grows value above invested and tracks average cost', () => {
    const r = simulateSip(sipPlan, { monthlyInvestmentAmount: 30000, months: 120 });
    expect(r.totalValue).toBeGreaterThan(r.totalInvested);
    for (const pos of r.positions) {
      if (pos.shares > 0) {
        expect(pos.averageCost).toBeGreaterThan(0);
        expect(pos.averageCost).toBeLessThanOrEqual(pos.endPrice + 0.01);
      }
    }
  });
});

const divPlan: DividendPlanPosition[] = [
  {
    symbol: 'A',
    companyName: 'A',
    sector: 'X',
    allocationPercent: 100,
    startPrice: 100,
    expectedAnnualReturn: 0.08,
    startDps: 8,
  },
];

describe('forecastDividends', () => {
  it('reinvest ON accumulates more shares and value than OFF', () => {
    const off = forecastDividends(divPlan, {
      monthlyInvestmentAmount: 20000,
      years: 15,
      reinvest: false,
    });
    const on = forecastDividends(divPlan, {
      monthlyInvestmentAmount: 20000,
      years: 15,
      reinvest: true,
    });
    expect(on.finalShares).toBeGreaterThan(off.finalShares);
    expect(on.finalValue).toBeGreaterThan(off.finalValue);
    expect(on.totalDividends).toBeGreaterThan(off.totalDividends);
  });

  it('emits a per-year series and a positive final monthly run-rate', () => {
    const f = forecastDividends(divPlan, {
      monthlyInvestmentAmount: 20000,
      years: 10,
      reinvest: false,
    });
    expect(f.perYear).toHaveLength(10);
    expect(f.finalMonthlyDividendIncome).toBeGreaterThan(0);
    expect(f.finalMonthlyDividendIncome).toBeCloseTo(f.finalAnnualDividendIncome / 12, 1);
    // cumulative dividends are non-decreasing
    for (let i = 1; i < f.perYear.length; i++) {
      expect(f.perYear[i]!.cumulativeDividends).toBeGreaterThanOrEqual(
        f.perYear[i - 1]!.cumulativeDividends
      );
    }
  });
});
