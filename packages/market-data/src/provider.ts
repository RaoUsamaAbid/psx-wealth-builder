import type { Company, Quote } from '@psx/shared';

/**
 * Provider abstraction. Business logic NEVER calls a third-party API/scraper
 * directly — everything goes through a MarketDataProvider.
 */
export interface MarketDataProvider {
  readonly name: string;
  getCompanies(): Promise<Company[]>;
  getQuote(symbol: string): Promise<Quote | null>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
}
