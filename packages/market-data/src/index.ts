/**
 * @psx/market-data — provider abstraction.
 * RULE: business logic NEVER calls a third-party API directly. Everything goes
 * through MarketDataProvider. Concrete providers are added in later phases
 * (Mock = Phase 1, CapitalStake/RealtimePsx = Phase 9, via scraping).
 */
import type { Company, Quote } from '@psx/shared';

export interface MarketDataProvider {
  readonly name: string;
  getCompanies(): Promise<Company[]>;
  getQuote(symbol: string): Promise<Quote | null>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
}

/** Phase 0 placeholder. Real seed-backed mock arrives in Phase 1. */
export class MockMarketDataProvider implements MarketDataProvider {
  readonly name = 'mock';

  async getCompanies(): Promise<Company[]> {
    return [];
  }

  async getQuote(_symbol: string): Promise<Quote | null> {
    return null;
  }

  async getQuotes(_symbols: string[]): Promise<Quote[]> {
    return [];
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
