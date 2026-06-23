import { describe, expect, it } from 'vitest';
import type { PortfolioRequest } from '@psx/shared';
import { recommendMonthlyBuys } from '@psx/engines';
import { makeUniverse } from './helpers';

const request: PortfolioRequest = {
  monthlyInvestmentAmount: 10_000,
  durationYears: 5,
  strategy: 'balanced',
  riskLevel: 'medium',
  index: 'KMI30',
  holdingsCount: 5,
  maxPerSector: 2,
};

const now = new Date('2026-01-01T12:00:00.000Z');

describe('recommendMonthlyBuys', () => {
  it('returns exact whole-share orders without overspending', () => {
    const result = recommendMonthlyBuys(makeUniverse(), request, [], {
      now,
      estimatedFeeRate: 0.0025,
      maxOrders: 3,
    });

    expect(result.orders.length).toBeGreaterThan(0);
    expect(result.orders.length).toBeLessThanOrEqual(3);
    expect(result.estimatedTotal).toBeLessThanOrEqual(result.availableCash);
    expect(result.remainingCash).toBeCloseTo(result.availableCash - result.estimatedTotal, 2);
    for (const order of result.orders) {
      expect(Number.isInteger(order.shares)).toBe(true);
      expect(order.shares).toBeGreaterThan(0);
      expect(order.estimatedTotal).toBeCloseTo(order.grossCost + order.estimatedFees, 2);
    }
  });

  it('directs money toward underweight holdings', () => {
    const empty = recommendMonthlyBuys(makeUniverse(), request, [], { now, maxOrders: 5 });
    const first = empty.orders[0]!;
    const existing = recommendMonthlyBuys(
      makeUniverse(),
      request,
      [{ symbol: first.symbol, shares: 100 }],
      { now, maxOrders: 5 }
    );

    expect(existing.orders.find((order) => order.symbol === first.symbol)).toBeUndefined();
  });

  it('includes carried cash and dividends in the spendable amount', () => {
    const result = recommendMonthlyBuys(makeUniverse(), request, [], {
      now,
      carriedCash: 500,
      availableDividends: 750,
    });
    expect(result.availableCash).toBe(11_250);
  });

  it('warns and holds cash when no target share is affordable', () => {
    const result = recommendMonthlyBuys(
      makeUniverse(),
      { ...request, monthlyInvestmentAmount: 10 },
      [],
      { now }
    );
    expect(result.orders).toHaveLength(0);
    expect(result.remainingCash).toBe(10);
    expect(result.warnings[0]).toContain('No affordable');
  });
});
