import { describe, it, expect } from 'vitest';
import type { DividendPlanPosition } from '@psx/shared';
import { annualizedIrr, projectWealth } from '@psx/engines';

describe('annualizedIrr', () => {
  it('solves so that NPV at the returned rate is ~0', () => {
    const C = 12000; // annual contribution
    const N = 10;
    const FV = 200000;
    const r = annualizedIrr(C, FV, N)!;
    expect(r).not.toBeNull();
    let npv = FV / (1 + r) ** N;
    for (let t = 1; t <= N; t++) npv -= C / (1 + r) ** t;
    expect(npv).toBeCloseTo(0, 2);
  });

  it('higher future value → higher IRR', () => {
    const a = annualizedIrr(12000, 150000, 10)!;
    const b = annualizedIrr(12000, 300000, 10)!;
    expect(b).toBeGreaterThan(a);
  });

  it('returns null for degenerate inputs', () => {
    expect(annualizedIrr(0, 100, 10)).toBeNull();
    expect(annualizedIrr(1000, 0, 10)).toBeNull();
  });
});

const plan: DividendPlanPosition[] = [
  {
    symbol: 'A',
    companyName: 'A',
    sector: 'X',
    allocationPercent: 50,
    startPrice: 100,
    expectedAnnualReturn: 0.12,
    startDps: 6,
    dividendGrowth: 0.1,
  },
  {
    symbol: 'B',
    companyName: 'B',
    sector: 'Y',
    allocationPercent: 50,
    startPrice: 80,
    expectedAnnualReturn: 0.1,
    startDps: 5,
    dividendGrowth: 0.08,
  },
];

describe('projectWealth', () => {
  it('produces conservative < base < optimistic future values', () => {
    const r = projectWealth(plan, { monthlyInvestmentAmount: 40000, years: 15, reinvest: true });
    const fv = (name: string) => r.scenarios.find((s) => s.scenario === name)!.futureValue;
    expect(fv('conservative')).toBeLessThan(fv('base'));
    expect(fv('base')).toBeLessThan(fv('optimistic'));
    expect(r.scenarios).toHaveLength(3);
  });

  it('solves an approximate required monthly for a target value', () => {
    const r = projectWealth(plan, {
      monthlyInvestmentAmount: 40000,
      years: 15,
      reinvest: true,
      targetValue: 20_000_000,
    });
    expect(r.targetSolve).not.toBeNull();
    const required = r.targetSolve!.requiredMonthlyInvestment;
    expect(required).toBeGreaterThan(0);
    // re-running with the solved amount lands near the target (linear model)
    const check = projectWealth(plan, {
      monthlyInvestmentAmount: required,
      years: 15,
      reinvest: true,
    });
    const baseFv = check.scenarios.find((s) => s.scenario === 'base')!.futureValue;
    expect(baseFv).toBeGreaterThan(20_000_000 * 0.9);
    expect(baseFv).toBeLessThan(20_000_000 * 1.1);
  });
});
