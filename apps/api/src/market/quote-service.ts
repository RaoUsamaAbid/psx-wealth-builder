import type { Quote } from '@psx/shared';
import type { MarketDataProvider } from '@psx/market-data';

export type MarketStatus = 'live' | 'stale' | 'down';

export interface MarketSnapshot {
  source: string;
  status: MarketStatus;
  lastUpdated: string | null;
  freshnessMs: number;
  count: number;
}

/**
 * In-memory quote cache fed by a MarketDataProvider (the DB-backed provider).
 * The realtime loop calls refresh() on an interval to pick up the latest synced
 * prices and push them to clients; status reflects cache freshness.
 */
export class QuoteService {
  private quotes = new Map<string, Quote>();
  private lastUpdated: string | null = null;
  private lastOkAt = 0;

  constructor(
    private readonly provider: MarketDataProvider,
    private readonly getSymbols: () => Promise<string[]>,
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
    return true;
  }

  private status(): MarketStatus {
    if (this.lastOkAt === 0) return 'down';
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
