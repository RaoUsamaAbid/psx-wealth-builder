import type {
  Portfolio,
  SipMonthPoint,
  SipPlanPosition,
  SipPositionResult,
  SipResult,
} from '@psx/shared';

/**
 * Monthly SIP (Systematic Investment Plan) engine.
 *
 * Each month the user contributes a fixed amount, split across positions by
 * their allocation percentage. Within a position we buy WHOLE shares and carry
 * the un-deployable remainder forward to the next month (realistic accumulation
 * — no fractional PSX shares). Average cost is tracked as deployed-cash / shares.
 *
 * Prices follow a deterministic monthly path from each position's expected
 * annual return. Richer scenario modelling (conservative/base/optimistic) is
 * the job of the Phase 5 projection engine — this engine just mechanics.
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;

function monthlyRate(annual: number): number {
  return (1 + annual) ** (1 / 12) - 1;
}

interface PositionState {
  plan: SipPlanPosition;
  rate: number;
  shares: number;
  invested: number;
  cash: number; // carried remainder
}

export interface SipOptions {
  monthlyInvestmentAmount: number;
  months: number;
}

export function simulateSip(positions: SipPlanPosition[], opts: SipOptions): SipResult {
  const { monthlyInvestmentAmount, months } = opts;
  const states: PositionState[] = positions.map((plan) => ({
    plan,
    rate: monthlyRate(plan.expectedAnnualReturn),
    shares: 0,
    invested: 0,
    cash: 0,
  }));

  const timeline: SipMonthPoint[] = [];

  for (let m = 1; m <= months; m++) {
    let marketValue = 0;
    let investedToDate = 0;
    let cashUninvested = 0;

    for (const s of states) {
      // Price at the start of month m (m=1 → startPrice).
      const price = s.plan.startPrice * (1 + s.rate) ** (m - 1);
      const monthlyAmount = (monthlyInvestmentAmount * s.plan.allocationPercent) / 100;
      const available = s.cash + monthlyAmount;
      const buy = price > 0 ? Math.floor(available / price) : 0;
      const spent = buy * price;
      s.shares += buy;
      s.invested += spent;
      s.cash = available - spent;

      marketValue += s.shares * price;
      investedToDate += s.invested;
      cashUninvested += s.cash;
    }

    timeline.push({
      month: m,
      contributedToDate: round2(monthlyInvestmentAmount * m),
      investedToDate: round2(investedToDate),
      cashUninvested: round2(cashUninvested),
      marketValue: round2(marketValue),
    });
  }

  const positionResults: SipPositionResult[] = states.map((s) => {
    const endPrice = s.plan.startPrice * (1 + s.rate) ** Math.max(0, months - 1);
    const marketValue = s.shares * endPrice;
    return {
      symbol: s.plan.symbol,
      companyName: s.plan.companyName,
      sector: s.plan.sector,
      shares: s.shares,
      invested: round2(s.invested),
      averageCost: s.shares > 0 ? round2(s.invested / s.shares) : 0,
      endPrice: round2(endPrice),
      marketValue: round2(marketValue),
      gainPercent: s.invested > 0 ? round2(((marketValue - s.invested) / s.invested) * 100) : 0,
    };
  });

  const totalInvested = round2(states.reduce((sum, s) => sum + s.invested, 0));
  const cashUninvested = round2(states.reduce((sum, s) => sum + s.cash, 0));
  const totalValue = round2(positionResults.reduce((sum, p) => sum + p.marketValue, 0));
  const totalContributed = round2(monthlyInvestmentAmount * months);

  return {
    months,
    monthlyInvestmentAmount,
    totalContributed,
    totalInvested,
    cashUninvested,
    totalValue,
    totalGainPercent:
      totalInvested > 0 ? round2(((totalValue - totalInvested) / totalInvested) * 100) : 0,
    positions: positionResults,
    timeline,
  };
}

/**
 * Build a SIP plan from a generated portfolio. `returnFor` supplies each
 * position's expected annual return (e.g. derived from fundamentals); falls
 * back to `defaultAnnualReturn` when not provided.
 */
export function planFromPortfolio(
  portfolio: Portfolio,
  returnFor: (symbol: string) => number | undefined,
  defaultAnnualReturn = 0
): SipPlanPosition[] {
  return portfolio.holdings.map((h) => ({
    symbol: h.symbol,
    companyName: h.companyName,
    sector: h.sector,
    allocationPercent: h.allocationPercent,
    startPrice: h.price,
    expectedAnnualReturn: returnFor(h.symbol) ?? defaultAnnualReturn,
  }));
}
