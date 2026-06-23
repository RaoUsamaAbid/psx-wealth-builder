import type { Company, Dividend, Fundamentals, Quote } from '@psx/shared';
import { fundamentalsFor, dividendsFor } from '../seed/generate.js';
import { SEED_COMPANIES } from '../seed/companies.js';
import { parsePsxConstituents, type PsxConstituent } from './constituents.js';

export interface SyncedUniverse {
  companies: Company[];
  quotes: Quote[];
  fundamentals: Fundamentals[];
  dividends: Dividend[];
  asOf: string;
}

/**
 * Build a code→name sector map by joining parsed rows against the curated seed
 * (whose sector names are correct). Codes seen on names we already know get an
 * accurate label; the rest fall back to `Sector <code>` until a deep sync fills
 * real names from company pages.
 */
export function buildSectorMap(constituents: PsxConstituent[]): Record<string, string> {
  const seedSector = new Map(SEED_COMPANIES.map((c) => [c.symbol, c.sector]));
  const map: Record<string, string> = {};
  for (const c of constituents) {
    const known = seedSector.get(c.symbol);
    if (known && c.sectorCode) map[c.sectorCode] = known;
  }
  return map;
}

/**
 * Turn a scraped market-watch page into a persistable universe: real companies
 * (KMI30 / Shariah membership, name, sector), real quotes, and — since the page
 * carries no fundamentals — deterministic placeholder fundamentals/dividends
 * derived from the REAL price (replaced by a deep sync later).
 */
export function buildUniverseFromMarketWatch(html: string, asOf: string): SyncedUniverse {
  const all = parsePsxConstituents(html);
  const shariah = all.filter((c) => c.isShariah);
  const sectorMap = buildSectorMap(all);

  const companies: Company[] = [];
  const quotes: Quote[] = [];
  const fundamentals: Fundamentals[] = [];
  const dividends: Dividend[] = [];

  for (const c of shariah) {
    const company: Company = {
      symbol: c.symbol,
      companyName: c.companyName,
      sector: sectorMap[c.sectorCode] ?? `Sector ${c.sectorCode || 'NA'}`,
      marketCap: 0, // not on market-watch; filled by a deep sync
      shariahCompliant: true,
      indices: c.isKmi30 ? ['KMI30', 'KMI100'] : ['KMI100'],
    };
    companies.push(company);
    quotes.push({
      symbol: c.symbol,
      price: c.price,
      change: c.change,
      changePercent: c.changePercent,
      asOf,
    });
    fundamentals.push(fundamentalsFor(company, c.price));
    dividends.push(...dividendsFor(company, c.price));
  }

  return { companies, quotes, fundamentals, dividends, asOf };
}
