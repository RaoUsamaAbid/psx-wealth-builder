import type { Quote } from '@psx/shared';
import type { MarketDataProvider } from '@psx/market-data';

export type MarketStatus = 'live' | 'simulated' | 'stale' | 'down';

export interface MarketSnapshot {
  source: string;
  status: MarketStatus;
  lastUpdated: string | null;
  freshnessMs: number;
  count: number;
}

/**
 * In-memory quote cache fed by a MarketDataProvider. Refreshes on demand (the
 * realtime loop calls refresh on an interval), persists successful pulls to
 * Mongo, and exposes a freshness-aware status (live / simulated / stale / down).
 */
export class QuoteService {
  private quotes = new Map<string, Quote>();
  private lastUpdated: string | null = null;
  private lastOkAt = 0;

  constructor(
    private readonly provider: MarketDataProvider,
    private readonly getSymbols: () => Promise<string[]>,
    private readonly persist: (quotes: Quote[]) => Promise<void>,
    private readonly freshnessMs: number,
    private readonly now: () => number = () => Date.now()
  ) {}

  async refresh(): Promise<boolean> {
    const symbols = await this.getSymbols();
    if (symbols.length === 0) return false;
    const quotes = await this.provider.getQuotes(symbols);
    if (quotes.length === 0) return false;
    for (const q of quotes) this.quotes.set(q.symbol, q);
    this.lastUpdated = new Date(this.now()).toISOString();
    this.lastOkAt = this.now();
    try {
      await this.persist(quotes);
    } catch {
      // persistence is best-effort; the live cache is still valid
    }
    return true;
  }

  private status(): MarketStatus {
    if (this.lastOkAt === 0) return 'down';
    if (this.provider.name === 'simulated' || this.provider.name === 'mock') return 'simulated';
    return this.now() - this.lastOkAt < this.freshnessMs ? 'live' : 'stale';
  }

  snapshot(): MarketSnapshot {
    return {
      source: this.provider.name,
      status: this.status(),
      lastUpdated: this.lastUpdated,
      freshnessMs: this.freshnessMs,
      count: this.quotes.size,
    };
  }

  quotesList(): Quote[] {
    return [...this.quotes.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  getQuote(symbol: string): Quote | null {
    return this.quotes.get(symbol.toUpperCase()) ?? null;
  }
}
