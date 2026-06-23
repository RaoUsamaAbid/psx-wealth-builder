import type { Company, Quote } from '@psx/shared';
import type { MarketDataProvider } from '@psx/market-data';
import type { Repositories } from '../repositories.js';

/**
 * Quote source backed by the database. The realtime loop reads the last-synced
 * quotes from Mongo (cheap) instead of scraping every tick — scraping now only
 * happens on the explicit Sync action.
 */
export class DbQuoteProvider implements MarketDataProvider {
  readonly name = 'synced';
  constructor(private readonly getRepos: () => Promise<Repositories>) {}

  async getCompanies(): Promise<Company[]> {
    return (await this.getRepos()).companies.findAll();
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const repos = await this.getRepos();
    const all = await repos.quotes.findAll();
    if (symbols.length === 0) return all;
    const want = new Set(symbols);
    return all.filter((q) => want.has(q.symbol));
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    return (await this.getRepos()).quotes.findBySymbol(symbol);
  }
}
