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

/** Everything known about one company, bundled for the engines. */
export interface CompanyData {
  company: Company;
  fundamentals: Fundamentals | null;
  quote: Quote | null;
  dividends: Dividend[];
}

/** User inputs that drive portfolio generation. */
export interface PortfolioRequest {
  monthlyInvestmentAmount: number; // PKR per month
  durationYears: number;
  strategy: Strategy;
  riskLevel: RiskLevel;
  index?: Index; // restrict universe (default: all KMI100)
  holdingsCount?: number; // target number of holdings (default 10)
  maxPerSector?: number; // diversification cap (default 2)
}

/** Per-company feature scores (0..1, higher = better) used by scoring. */
export interface ScoreFeatures {
  yield: number;
  dividendGrowth: number;
  epsGrowth: number;
  revenueGrowth: number;
  roe: number;
  value: number; // cheaper P/E = higher
  lowBeta: number;
  lowDebt: number;
}

export interface ScoredCompany {
  company: Company;
  score: number; // 0..100
  features: ScoreFeatures;
}

export interface PortfolioHolding {
  symbol: string;
  companyName: string;
  sector: string;
  score: number;
  allocationPercent: number; // 0..100
  targetAmount: number; // PKR allocated this month
  price: number; // PKR per share
  shares: number; // whole shares purchasable
  cost: number; // shares * price
}

export interface Portfolio {
  request: PortfolioRequest;
  holdings: PortfolioHolding[];
  investedThisMonth: number; // sum of holding costs
  leftoverCash: number; // monthly amount not deployable into whole shares
  generatedAt: string; // ISO timestamp
}

export const APP_NAME = 'PSX Wealth Builder';
