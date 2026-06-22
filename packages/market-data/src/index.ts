/**
 * @psx/market-data — provider abstraction.
 * RULE: business logic NEVER calls a third-party API directly. Everything goes
 * through MarketDataProvider. Concrete providers are added in later phases
 * (Mock = Phase 1, CapitalStake/RealtimePsx = Phase 9, via scraping).
 */
import type { Company, Quote } from '@psx/shared';
import { SEED_COMPANIES, SEED_QUOTES } from './seed/index.js';

export * from './seed/index.js';

export interface MarketDataProvider {
  readonly name: string;
  getCompanies(): Promise<Company[]>;
  getQuote(symbol: string): Promise<Quote | null>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
}

/** Seed-backed provider for offline/dev use (no DB, no network). */
export class MockMarketDataProvider implements MarketDataProvider {
  readonly name = 'mock';
  private readonly quotes = new Map(SEED_QUOTES.map((q) => [q.symbol, q]));

  async getCompanies(): Promise<Company[]> {
    return SEED_COMPANIES;
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    return this.quotes.get(symbol) ?? null;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return symbols.map((s) => this.quotes.get(s)).filter((q): q is Quote => q != null);
  }
}

export type ProviderKind = 'mock' | 'capitalstake' | 'realtime';

export function createProvider(kind: ProviderKind = 'mock'): MarketDataProvider {
  switch (kind) {
    case 'mock':
      return new MockMarketDataProvider();
    default:
      // CapitalStake / Realtime implemented in Phase 9.
      return new MockMarketDataProvider();
  }
}
