/**
 * @psx/market-data — provider abstraction + concrete providers.
 * RULE: business logic NEVER calls a third-party API/scraper directly.
 * Mock = seed-backed (Phase 1); Simulated = random-walk realtime (offline demo);
 * Realtime/CapitalStake = scrapers with fallback (Phase 9).
 */
import type { Company, Quote } from '@psx/shared';
import { SEED_COMPANIES, SEED_QUOTES } from './seed/index.js';
import type { MarketDataProvider } from './provider.js';
import { SimulatedRealtimeProvider } from './providers/simulated.js';
import { createRealtimePsxProvider, createCapitalStakeProvider } from './providers/realtime.js';

export type { MarketDataProvider } from './provider.js';
export * from './seed/index.js';
export { SimulatedRealtimeProvider } from './providers/simulated.js';
export { ScrapingProvider } from './providers/realtime.js';
export { scrapePsx, parsePsxMarketWatch, fetchPsxMarketWatchHtml } from './scraping/psx.js';
export { scrapeCapitalStake, parseCapitalStake } from './scraping/capitalstake.js';
export { parsePsxConstituents, type PsxConstituent } from './sync/constituents.js';
export {
  buildUniverseFromMarketWatch,
  buildSectorMap,
  universeToCompanyData,
  type SyncedUniverse,
} from './sync/sync.js';

/** Static seed-backed provider (deterministic; for engines/offline use). */
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

export type ProviderKind = 'mock' | 'simulated' | 'capitalstake' | 'realtime';

/**
 * Build a provider by kind. Realtime/CapitalStake scrape live data and fall
 * back to the simulated provider so quotes keep moving even when the network
 * or page layout fails.
 */
export function createProvider(kind: ProviderKind = 'mock'): MarketDataProvider {
  switch (kind) {
    case 'mock':
      return new MockMarketDataProvider();
    case 'simulated':
      return new SimulatedRealtimeProvider();
    case 'realtime':
      return createRealtimePsxProvider(new SimulatedRealtimeProvider());
    case 'capitalstake':
      return createCapitalStakeProvider(new SimulatedRealtimeProvider());
    default:
      return new MockMarketDataProvider();
  }
}
