import type { Company, Quote } from '@psx/shared';
import type { MarketDataProvider } from '../provider.js';
import { scrapePsx } from '../scraping/psx.js';
import { scrapeCapitalStake } from '../scraping/capitalstake.js';

type ScrapeFn = () => Promise<Quote[]>;

/**
 * A provider backed by a scraper, with a fallback provider for resilience.
 * Companies always come from the fallback (the DB/seed is the source of truth
 * for the universe); only live quotes are scraped. If a scrape yields nothing
 * (network blocked, layout changed), quotes fall back too.
 */
export class ScrapingProvider implements MarketDataProvider {
  constructor(
    readonly name: string,
    private readonly scrape: ScrapeFn,
    private readonly fallback: MarketDataProvider
  ) {}

  async getCompanies(): Promise<Company[]> {
    return this.fallback.getCompanies();
  }

  private async scrapedMap(): Promise<Map<string, Quote>> {
    const quotes = await this.scrape();
    return new Map(quotes.map((q) => [q.symbol, q]));
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const scraped = await this.scrapedMap();
    const hits = symbols.map((s) => scraped.get(s)).filter((q): q is Quote => q != null);
    if (hits.length > 0) return hits;
    return this.fallback.getQuotes(symbols);
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const [q] = await this.getQuotes([symbol]);
    return q ?? null;
  }
}

export function createRealtimePsxProvider(fallback: MarketDataProvider): MarketDataProvider {
  return new ScrapingProvider('realtime', () => scrapePsx(), fallback);
}

export function createCapitalStakeProvider(fallback: MarketDataProvider): MarketDataProvider {
  return new ScrapingProvider('capitalstake', () => scrapeCapitalStake(), fallback);
}
