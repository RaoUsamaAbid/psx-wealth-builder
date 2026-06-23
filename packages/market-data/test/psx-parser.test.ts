import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parsePsxMarketWatch } from '@psx/market-data';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  resolve(here, '../src/scraping/__fixtures__/psx-market-watch.html'),
  'utf-8'
);
const AS_OF = '2026-01-01T00:00:00.000Z';

/**
 * The fixture is a verbatim slice of the live PSX market-watch page. These
 * expectations are the REAL values that were on the page when captured — the
 * parser must reproduce them exactly. If PSX changes its DOM, this test fails
 * loudly rather than letting wrong prices flow into the app.
 */
const EXPECTED: Record<string, { price: number; change: number; pct: number }> = {
  OGDC: { price: 334.25, change: 2.97, pct: 0.897 },
  MEBL: { price: 512.17, change: -0.81, pct: -0.158 },
  FFC: { price: 557.94, change: -2.8, pct: -0.499 },
  LUCK: { price: 459.06, change: -3.92, pct: -0.847 },
  WTL: { price: 1.26, change: -0.03, pct: -2.326 },
};

describe('parsePsxMarketWatch', () => {
  const quotes = parsePsxMarketWatch(fixture, AS_OF);
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  it('parses every fixture row', () => {
    expect(quotes.length).toBe(Object.keys(EXPECTED).length);
  });

  it.each(Object.entries(EXPECTED))('reads accurate price/change for %s', (sym, exp) => {
    const q = bySymbol.get(sym);
    expect(q, `missing ${sym}`).toBeDefined();
    expect(q!.price).toBeCloseTo(exp.price, 2);
    expect(q!.change).toBeCloseTo(exp.change, 2);
    expect(q!.changePercent).toBeCloseTo(exp.pct, 2);
    expect(q!.asOf).toBe(AS_OF);
  });

  it('never emits NaN, Infinity, or non-positive prices', () => {
    for (const q of quotes) {
      expect(Number.isFinite(q.price)).toBe(true);
      expect(q.price).toBeGreaterThan(0);
      expect(Number.isFinite(q.change)).toBe(true);
      expect(Number.isFinite(q.changePercent)).toBe(true);
      // sanity: real PSX daily moves never exceed circuit-breaker bounds
      expect(Math.abs(q.changePercent)).toBeLessThan(12);
    }
  });

  it('captures sign correctly (down moves stay negative)', () => {
    expect(bySymbol.get('WTL')!.change).toBeLessThan(0);
    expect(bySymbol.get('OGDC')!.change).toBeGreaterThan(0);
  });

  it('returns [] for empty or non-table HTML (resilient fallback)', () => {
    expect(parsePsxMarketWatch('')).toEqual([]);
    expect(parsePsxMarketWatch('<html><body>no table here</body></html>')).toEqual([]);
    expect(parsePsxMarketWatch('<table><tbody><tr><td>x</td></tr></tbody></table>')).toEqual([]);
  });
});
