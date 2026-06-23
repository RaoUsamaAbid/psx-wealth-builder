import type {
  DividendForecast,
  DividendPlanPosition,
  DividendPositionResult,
  DividendYearPoint,
  Portfolio,
} from '@psx/shared';

/**
 * Dividend forecast engine.
 *
 * Simulates monthly SIP contributions plus annual dividend payments over a
 * horizon, under two scenarios:
 *   - reinvest OFF: dividends are paid out as cash income (kept aside)
 *   - reinvest ON:  dividends buy more whole shares at the current price (DRIP),
 *     compounding the share count
 *
 * Dividends are modelled as a single annual payment (PSX names often pay
 * semi-annually/quarterly; aggregated here for clarity). DPS grows each year by
 * the position's dividend growth rate; prices follow the expected-return path.
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;
const monthlyRate = (annual: number): number => (1 + annual) ** (1 / 12) - 1;

interface State {
  plan: DividendPlanPosition;
  priceRate: number;
  shares: number;
  contribCash: number; // carried SIP remainder
  divCash: number; // carried dividend remainder (reinvest on) / payout (off)
  cumulativeDividends: number;
  lastYearIncome: number;
}

export interface DividendOptions {
  monthlyInvestmentAmount: number;
  years: number;
  reinvest: boolean;
}

function priceAt(plan: DividendPlanPosition, rate: number, month: number): number {
  return plan.startPrice * (1 + rate) ** (month - 1);
}

export function forecastDividends(
  positions: DividendPlanPosition[],
  opts: DividendOptions
): DividendForecast {
  const { monthlyInvestmentAmount, years, reinvest } = opts;
  const months = years * 12;
  const states: State[] = positions.map((plan) => ({
    plan,
    priceRate: monthlyRate(plan.expectedAnnualReturn),
    shares: 0,
    contribCash: 0,
    divCash: 0,
    cumulativeDividends: 0,
    lastYearIncome: 0,
  }));

  const perYear: DividendYearPoint[] = [];
  let cumulativeDividends = 0;

  for (let m = 1; m <= months; m++) {
    // Monthly contribution → whole-share buys.
    for (const s of states) {
      const price = priceAt(s.plan, s.priceRate, m);
      const available = s.contribCash + (monthlyInvestmentAmount * s.plan.allocationPercent) / 100;
      const buy = price > 0 ? Math.floor(available / price) : 0;
      s.shares += buy;
      s.contribCash = available - buy * price;
    }

    // Annual dividend event at each year boundary.
    if (m % 12 === 0) {
      const year = m / 12;
      let yearIncome = 0;
      let yearReinvested = 0;

      for (const s of states) {
        const price = priceAt(s.plan, s.priceRate, m);
        // Dividends as a constant yield on the evolving price (DPS grows with
        // the share price). This keeps reinvestment well-behaved — share count
        // compounds at the yield rate regardless of the price path — so higher
        // expected return always means higher value (monotonic scenarios).
        const startYield = s.plan.startPrice > 0 ? s.plan.startDps / s.plan.startPrice : 0;
        const dps = startYield * price;
        const income = s.shares * dps;
        s.cumulativeDividends += income;
        s.lastYearIncome = income;
        yearIncome += income;

        if (reinvest) {
          const available = s.divCash + income;
          const buy = price > 0 ? Math.floor(available / price) : 0;
          s.shares += buy;
          s.divCash = available - buy * price;
          yearReinvested += buy * price;
        } else {
          s.divCash += income; // paid out, kept as cash
        }
      }

      cumulativeDividends += yearIncome;
      const value = states.reduce((sum, s) => {
        const price = priceAt(s.plan, s.priceRate, m);
        return sum + s.shares * price + s.contribCash + s.divCash;
      }, 0);

      perYear.push({
        year,
        sharesEnd: states.reduce((sum, s) => sum + s.shares, 0),
        dividendIncome: round2(yearIncome),
        cumulativeDividends: round2(cumulativeDividends),
        reinvested: round2(yearReinvested),
        portfolioValue: round2(value),
      });
    }
  }

  const positionResults: DividendPositionResult[] = states.map((s) => ({
    symbol: s.plan.symbol,
    companyName: s.plan.companyName,
    sector: s.plan.sector,
    shares: s.shares,
    annualDividendIncome: round2(s.lastYearIncome),
    cumulativeDividends: round2(s.cumulativeDividends),
  }));

  const finalShares = states.reduce((sum, s) => sum + s.shares, 0);
  const finalPriceValue = states.reduce((sum, s) => {
    const price = priceAt(s.plan, s.priceRate, months);
    return sum + s.shares * price + s.contribCash + s.divCash;
  }, 0);
  const finalAnnualDividendIncome = states.reduce((sum, s) => sum + s.lastYearIncome, 0);

  return {
    years,
    reinvest,
    monthlyInvestmentAmount,
    totalContributed: round2(monthlyInvestmentAmount * months),
    totalDividends: round2(cumulativeDividends),
    finalShares,
    finalValue: round2(finalPriceValue),
    finalAnnualDividendIncome: round2(finalAnnualDividendIncome),
    finalMonthlyDividendIncome: round2(finalAnnualDividendIncome / 12),
    perYear,
    positions: positionResults,
  };
}

/**
 * Build a dividend plan from a generated portfolio. The callback supplies each
 * holding's expected price return and latest dividend-per-share (the dividend
 * yield is `startDps / startPrice`).
 */
export function dividendPlanFromPortfolio(
  portfolio: Portfolio,
  meta: (symbol: string) => { expectedAnnualReturn: number; startDps: number }
): DividendPlanPosition[] {
  return portfolio.holdings.map((h) => {
    const m = meta(h.symbol);
    return {
      symbol: h.symbol,
      companyName: h.companyName,
      sector: h.sector,
      allocationPercent: h.allocationPercent,
      startPrice: h.price,
      expectedAnnualReturn: m.expectedAnnualReturn,
      startDps: m.startDps,
    };
  });
}
