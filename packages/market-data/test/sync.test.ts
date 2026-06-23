import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  parsePsxConstituents,
  buildUniverseFromMarketWatch,
  buildSectorMap,
} from '@psx/market-data';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  resolve(here, '../src/scraping/__fixtures__/psx-market-watch.html'),
  'utf-8'
);
const AS_OF = '2026-01-01T00:00:00.000Z';

describe('parsePsxConstituents', () => {
  const cs = parsePsxConstituents(fixture);
  const bySym = new Map(cs.map((c) => [c.symbol, c]));

  it('extracts company name, sector code and index membership', () => {
    const ogdc = bySym.get('OGDC')!;
    expect(ogdc.companyName).toBe('Oil & Gas Development Company Limited');
    expect(ogdc.sectorCode).toBe('0820');
    expect(ogdc.isKmi30).toBe(true);
    expect(ogdc.isShariah).toBe(true);
    expect(ogdc.price).toBeCloseTo(334.25, 2);
  });

  it('flags non-Shariah names correctly', () => {
    // WTL (Worldcall) is in the fixture but not in any KMI index
    const wtl = bySym.get('WTL')!;
    expect(wtl.isShariah).toBe(false);
    expect(wtl.isKmi30).toBe(false);
  });
});

describe('buildSectorMap', () => {
  it('resolves sector codes to names via the curated seed', () => {
    const map = buildSectorMap(parsePsxConstituents(fixture));
    expect(map['0820']).toBe('Oil & Gas Exploration'); // OGDC's seed sector
  });
});

describe('buildUniverseFromMarketWatch', () => {
  const u = buildUniverseFromMarketWatch(fixture, AS_OF);

  it('keeps only Shariah-compliant names', () => {
    const symbols = u.companies.map((c) => c.symbol);
    expect(symbols).toContain('OGDC');
    expect(symbols).not.toContain('WTL'); // non-Shariah excluded
    expect(u.companies.every((c) => c.shariahCompliant)).toBe(true);
  });

  it('marks KMI30 names in both index tiers with real names + prices', () => {
    const ogdc = u.companies.find((c) => c.symbol === 'OGDC')!;
    expect(ogdc.indices).toEqual(['KMI30', 'KMI100']);
    expect(ogdc.companyName).toContain('Oil & Gas Development');
    expect(ogdc.sector).toBe('Oil & Gas Exploration');
    const q = u.quotes.find((x) => x.symbol === 'OGDC')!;
    expect(q.price).toBeCloseTo(334.25, 2);
    expect(q.asOf).toBe(AS_OF);
  });

  it('generates fundamentals + dividends keyed to the real price', () => {
    const f = u.fundamentals.find((x) => x.symbol === 'OGDC')!;
    expect(f.eps).toBeGreaterThan(0);
    // eps * pe ≈ real price
    expect(f.eps * f.peRatio).toBeCloseTo(334.25, 0);
    const divs = u.dividends.filter((d) => d.symbol === 'OGDC');
    expect(divs.length).toBe(5);
  });
});
