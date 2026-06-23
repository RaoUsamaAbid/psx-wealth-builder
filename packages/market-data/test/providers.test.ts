import { describe, it, expect } from 'vitest';
import {
  SEED_COMPANIES,
  SEED_QUOTES,
  MockMarketDataProvider,
  SimulatedRealtimeProvider,
  createProvider,
} from '@psx/market-data';

describe('seed data', () => {
  it('every company is Shariah-compliant and KMI-indexed', () => {
    expect(SEED_COMPANIES.length).toBeGreaterThanOrEqual(40);
    for (const c of SEED_COMPANIES) {
      expect(c.shariahCompliant).toBe(true);
      expect(c.indices).toContain('KMI100');
      expect(c.marketCap).toBeGreaterThan(0);
    }
  });
  it('has exactly 30 KMI30 names, all also in KMI100', () => {
    const kmi30 = SEED_COMPANIES.filter((c) => c.indices.includes('KMI30'));
    expect(kmi30.length).toBe(30);
    for (const c of kmi30) expect(c.indices).toContain('KMI100');
  });
  it('symbols are unique', () => {
    const set = new Set(SEED_COMPANIES.map((c) => c.symbol));
    expect(set.size).toBe(SEED_COMPANIES.length);
  });
});

describe('MockMarketDataProvider', () => {
  const p = new MockMarketDataProvider();
  it('returns the static seed quotes', async () => {
    const q = await p.getQuote('OGDC');
    expect(q?.price).toBe(SEED_QUOTES.find((x) => x.symbol === 'OGDC')!.price);
  });
  it('filters getQuotes to known symbols', async () => {
    const qs = await p.getQuotes(['OGDC', 'NOPE']);
    expect(qs.map((q) => q.symbol)).toEqual(['OGDC']);
  });
});

describe('SimulatedRealtimeProvider', () => {
  it('walks prices but stays within ±20% of the seed baseline', async () => {
    const p = new SimulatedRealtimeProvider();
    const symbols = SEED_COMPANIES.map((c) => c.symbol);
    for (let tick = 0; tick < 50; tick++) {
      const quotes = await p.getQuotes(symbols);
      expect(quotes.length).toBe(symbols.length);
      for (const q of quotes) {
        const base = SEED_QUOTES.find((x) => x.symbol === q.symbol)!.price;
        expect(q.price).toBeGreaterThanOrEqual(base * 0.8 - 0.01);
        expect(q.price).toBeLessThanOrEqual(base * 1.2 + 0.01);
        expect(Number.isFinite(q.changePercent)).toBe(true);
        expect(Math.abs(q.changePercent)).toBeLessThan(25);
      }
    }
  });
});

describe('createProvider', () => {
  it('maps kinds to providers with realtime falling back to a simulated walk', () => {
    expect(createProvider('mock').name).toBe('mock');
    expect(createProvider('simulated').name).toBe('simulated');
    expect(createProvider('realtime').name).toBe('realtime');
    expect(createProvider('capitalstake').name).toBe('capitalstake');
  });
});
