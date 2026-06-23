import type { Company, Quote } from '@psx/shared';
import { SEED_COMPANIES, SEED_QUOTES } from '../seed/index.js';
import type { MarketDataProvider } from '../provider.js';

/**
 * Simulated realtime provider. Random-walks the seed prices on every poll so the
 * realtime pipeline (cache → socket push → freshness) is demonstrable without a
 * live network feed. Used as the offline fallback and when MARKET_DATA_PROVIDER
 * is `mock`/`simulated`. `change`/`changePercent` are measured against the seed
 * (previous-close) baseline.
 */
export class SimulatedRealtimeProvider implements MarketDataProvider {
  readonly name = 'simulated';
  private readonly base = new Map(SEED_QUOTES.map((q) => [q.symbol, q.price]));
  private readonly last = new Map(SEED_QUOTES.map((q) => [q.symbol, q.price]));

  async getCompanies(): Promise<Company[]> {
    return SEED_COMPANIES;
  }

  private walk(symbol: string): Quote | null {
    const base = this.base.get(symbol);
    const prev = this.last.get(symbol);
    if (base == null || prev == null) return null;
    // ±1.5% step, kept within ±20% of the seed baseline.
    const step = (Math.random() * 2 - 1) * 0.015;
    let price = prev * (1 + step);
    price = Math.min(base * 1.2, Math.max(base * 0.8, price));
    price = Math.round(price * 100) / 100;
    this.last.set(symbol, price);
    const change = Math.round((price - base) * 100) / 100;
    const changePercent = base > 0 ? Math.round((change / base) * 10000) / 100 : 0;
    return { symbol, price, change, changePercent, asOf: new Date().toISOString() };
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    return this.walk(symbol);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return symbols.map((s) => this.walk(s)).filter((q): q is Quote => q != null);
  }
}
