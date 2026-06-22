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

export const APP_NAME = 'PSX Wealth Builder';
