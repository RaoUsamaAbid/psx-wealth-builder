/**
 * @psx/shared — domain types shared across api, engines, market-data, web.
 * Phase 0: foundational enums + a few core types. Expanded in later phases.
 */

export type Index = 'KMI30' | 'KMI100';

export type Strategy = 'dividend' | 'growth' | 'balanced';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Company {
  symbol: string;
  companyName: string;
  sector: string;
  marketCap: number;
  shariahCompliant: boolean;
  indices: Index[];
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  asOf: string; // ISO timestamp
}

/**
 * Per-company fundamentals. Phase 1 seeds illustrative placeholder values;
 * real figures are scraped in Phase 9. Ratios are fractions (0.05 = 5%).
 */
export interface Fundamentals {
  symbol: string;
  eps: number; // earnings per share (PKR)
  peRatio: number;
  bookValue: number; // per share (PKR)
  roe: number; // return on equity (fraction)
  epsGrowth: number; // YoY (fraction)
  revenueGrowth: number; // YoY (fraction)
  dividendYield: number; // fraction
  debtRatio: number; // total debt / total assets (fraction)
  beta: number; // volatility vs market
  asOf: string; // ISO timestamp
}

/** A single dividend payment record. */
export interface Dividend {
  symbol: string;
  year: number;
  amountPerShare: number; // PKR
  payoutRatio: number; // fraction of EPS paid out
}

export const INDICES: readonly Index[] = ['KMI30', 'KMI100'];

export const APP_NAME = 'PSX Wealth Builder';
