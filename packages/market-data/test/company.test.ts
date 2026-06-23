import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parsePsxCompany } from '@psx/market-data';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  resolve(here, '../src/scraping/__fixtures__/psx-company-ogdc.html'),
  'utf-8'
);

describe('parsePsxCompany', () => {
  const d = parsePsxCompany(fixture);

  it('extracts real sector name and company name', () => {
    expect(d.sector).toBe('Oil & Gas Exploration');
    expect(d.companyName).toContain('Oil & Gas Development');
  });

  it('extracts real market cap, shares and P/E', () => {
    expect(d.marketCap).toBe(1_437_585_317_700); // (000s) * 1000
    expect(d.shares).toBe(4_300_928_400);
    expect(d.peRatio).toBeCloseTo(8.56, 2);
  });

  it('extracts real EPS, EPS growth and revenue growth', () => {
    expect(d.eps).toBeCloseTo(39.5, 2);
    expect(d.epsGrowth).toBeCloseTo(-0.1871, 4); // (18.71)%
    expect(d.revenueGrowth).toBeCloseTo(-0.1348, 3); // 401,177,969 / 463,697,861 - 1
  });

  it('is resilient to empty / junk HTML', () => {
    expect(parsePsxCompany('')).toEqual({});
    expect(parsePsxCompany('<html><body>nope</body></html>')).toEqual({});
  });
});
