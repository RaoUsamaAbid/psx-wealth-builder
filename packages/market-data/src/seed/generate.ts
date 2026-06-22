import type { Company, Dividend, Fundamentals, Quote } from '@psx/shared';
import { SEED_COMPANIES } from './companies.js';

/**
 * Deterministic seed generator. Values are ILLUSTRATIVE placeholders derived
 * from a stable hash of each symbol — NOT real financials. They exist so the
 * scoring/ranking/dividend/projection engines (Phases 2–8) have realistic,
 * reproducible inputs to work against. Replaced by scraped data in Phase 9.
 */

// Fixed timestamp so re-seeding is idempotent (no Date.now drift).
export const SEED_AS_OF = '2026-01-01T00:00:00.000Z';
const SEED_YEAR = 2025;

/** FNV-1a hash → deterministic float in [0, 1). */
function rand01(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Jitter a base value by ±spread using a keyed deterministic factor. */
function jitter(base: number, spread: number, key: string): number {
  return base + (rand01(key) * 2 - 1) * spread;
}

interface SectorProfile {
  pe: number; // base P/E
  pb: number; // base price/book
  yield: number; // base dividend yield (fraction)
  epsGrowth: number; // base YoY EPS growth (fraction)
  revGrowth: number; // base YoY revenue growth (fraction)
  debt: number; // base debt ratio (fraction)
  beta: number; // base beta
  divGrowth: number; // base annual dividend growth (fraction)
}

const DEFAULT_PROFILE: SectorProfile = {
  pe: 9,
  pb: 1.6,
  yield: 0.06,
  epsGrowth: 0.1,
  revGrowth: 0.1,
  debt: 0.3,
  beta: 1.0,
  divGrowth: 0.08,
};

const SECTOR_PROFILES: Record<string, SectorProfile> = {
  'Islamic Banking': {
    pe: 6,
    pb: 1.4,
    yield: 0.1,
    epsGrowth: 0.12,
    revGrowth: 0.14,
    debt: 0.1,
    beta: 0.95,
    divGrowth: 0.12,
  },
  Fertilizer: {
    pe: 7,
    pb: 2.2,
    yield: 0.13,
    epsGrowth: 0.08,
    revGrowth: 0.09,
    debt: 0.25,
    beta: 0.8,
    divGrowth: 0.1,
  },
  'Oil & Gas Exploration': {
    pe: 5,
    pb: 1.1,
    yield: 0.08,
    epsGrowth: 0.07,
    revGrowth: 0.08,
    debt: 0.15,
    beta: 1.1,
    divGrowth: 0.07,
  },
  'Oil & Gas Marketing': {
    pe: 6,
    pb: 1.2,
    yield: 0.07,
    epsGrowth: 0.09,
    revGrowth: 0.12,
    debt: 0.4,
    beta: 1.15,
    divGrowth: 0.06,
  },
  Refinery: {
    pe: 6,
    pb: 1.0,
    yield: 0.05,
    epsGrowth: 0.06,
    revGrowth: 0.1,
    debt: 0.45,
    beta: 1.25,
    divGrowth: 0.05,
  },
  Cement: {
    pe: 8,
    pb: 1.3,
    yield: 0.04,
    epsGrowth: 0.15,
    revGrowth: 0.13,
    debt: 0.4,
    beta: 1.3,
    divGrowth: 0.06,
  },
  Technology: {
    pe: 14,
    pb: 3.5,
    yield: 0.02,
    epsGrowth: 0.3,
    revGrowth: 0.28,
    debt: 0.12,
    beta: 1.2,
    divGrowth: 0.15,
  },
  'Food & Personal Care': {
    pe: 22,
    pb: 8,
    yield: 0.03,
    epsGrowth: 0.14,
    revGrowth: 0.13,
    debt: 0.2,
    beta: 0.6,
    divGrowth: 0.12,
  },
  'Personal Goods': {
    pe: 20,
    pb: 7,
    yield: 0.035,
    epsGrowth: 0.12,
    revGrowth: 0.11,
    debt: 0.15,
    beta: 0.65,
    divGrowth: 0.11,
  },
  Pharmaceuticals: {
    pe: 16,
    pb: 3,
    yield: 0.04,
    epsGrowth: 0.16,
    revGrowth: 0.15,
    debt: 0.18,
    beta: 0.8,
    divGrowth: 0.12,
  },
  'Automobile Assembler': {
    pe: 9,
    pb: 2,
    yield: 0.06,
    epsGrowth: 0.1,
    revGrowth: 0.11,
    debt: 0.2,
    beta: 1.05,
    divGrowth: 0.08,
  },
  Chemicals: {
    pe: 8,
    pb: 1.8,
    yield: 0.07,
    epsGrowth: 0.1,
    revGrowth: 0.1,
    debt: 0.35,
    beta: 1.1,
    divGrowth: 0.08,
  },
  'Power Generation': {
    pe: 4,
    pb: 0.9,
    yield: 0.11,
    epsGrowth: 0.05,
    revGrowth: 0.06,
    debt: 0.5,
    beta: 0.9,
    divGrowth: 0.05,
  },
  Conglomerate: {
    pe: 8,
    pb: 1.5,
    yield: 0.07,
    epsGrowth: 0.11,
    revGrowth: 0.1,
    debt: 0.3,
    beta: 1.0,
    divGrowth: 0.09,
  },
  Textile: {
    pe: 7,
    pb: 1.0,
    yield: 0.05,
    epsGrowth: 0.09,
    revGrowth: 0.1,
    debt: 0.45,
    beta: 1.1,
    divGrowth: 0.06,
  },
  Engineering: {
    pe: 9,
    pb: 1.4,
    yield: 0.06,
    epsGrowth: 0.1,
    revGrowth: 0.1,
    debt: 0.3,
    beta: 1.0,
    divGrowth: 0.08,
  },
  'Paper & Board': {
    pe: 10,
    pb: 1.5,
    yield: 0.05,
    epsGrowth: 0.1,
    revGrowth: 0.09,
    debt: 0.35,
    beta: 0.95,
    divGrowth: 0.07,
  },
  'Glass & Ceramics': {
    pe: 10,
    pb: 1.6,
    yield: 0.045,
    epsGrowth: 0.11,
    revGrowth: 0.1,
    debt: 0.3,
    beta: 1.0,
    divGrowth: 0.07,
  },
  Insurance: {
    pe: 8,
    pb: 1.3,
    yield: 0.07,
    epsGrowth: 0.1,
    revGrowth: 0.09,
    debt: 0.2,
    beta: 0.85,
    divGrowth: 0.08,
  },
};

function profileFor(sector: string): SectorProfile {
  return SECTOR_PROFILES[sector] ?? DEFAULT_PROFILE;
}

/** Plausible share price (PKR), loosely scaled by market-cap tier. */
function priceFor(c: Company): number {
  const capB = c.marketCap / 1_000_000_000;
  const tier = capB > 300 ? 250 : capB > 100 ? 160 : capB > 50 ? 110 : 70;
  return Math.round(jitter(tier, tier * 0.5, `${c.symbol}:price`) * 100) / 100;
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function fundamentalsFor(c: Company): Fundamentals {
  const p = profileFor(c.sector);
  const price = priceFor(c);
  const peRatio = Math.max(2, jitter(p.pe, p.pe * 0.25, `${c.symbol}:pe`));
  const pb = Math.max(0.4, jitter(p.pb, p.pb * 0.25, `${c.symbol}:pb`));
  const eps = price / peRatio;
  const bookValue = price / pb;
  return {
    symbol: c.symbol,
    eps: round(eps),
    peRatio: round(peRatio),
    bookValue: round(bookValue),
    roe: round(eps / bookValue, 4),
    epsGrowth: round(Math.max(-0.1, jitter(p.epsGrowth, 0.05, `${c.symbol}:epsg`)), 4),
    revenueGrowth: round(Math.max(-0.1, jitter(p.revGrowth, 0.05, `${c.symbol}:revg`)), 4),
    dividendYield: round(Math.max(0, jitter(p.yield, p.yield * 0.3, `${c.symbol}:dy`)), 4),
    debtRatio: round(Math.min(0.85, Math.max(0.02, jitter(p.debt, 0.1, `${c.symbol}:debt`))), 4),
    beta: round(Math.max(0.3, jitter(p.beta, 0.2, `${c.symbol}:beta`)), 2),
    asOf: SEED_AS_OF,
  };
}

export function quoteFor(c: Company): Quote {
  const price = priceFor(c);
  const changePercent = round(jitter(0, 2.5, `${c.symbol}:chg`), 2);
  const change = round((price * changePercent) / 100, 2);
  return { symbol: c.symbol, price, change, changePercent, asOf: SEED_AS_OF };
}

/** Five years of dividend history, growing toward the latest year. */
export function dividendsFor(c: Company): Dividend[] {
  const f = fundamentalsFor(c);
  const p = profileFor(c.sector);
  const latest = priceFor(c) * f.dividendYield; // latest amount per share
  const growth = Math.max(0.02, jitter(p.divGrowth, 0.03, `${c.symbol}:dg`));
  const out: Dividend[] = [];
  for (let i = 0; i < 5; i++) {
    const year = SEED_YEAR - i;
    const amountPerShare = round(latest / (1 + growth) ** i);
    const payoutRatio = f.eps > 0 ? round(Math.min(1, amountPerShare / f.eps), 4) : 0;
    out.push({ symbol: c.symbol, year, amountPerShare, payoutRatio });
  }
  return out.reverse(); // oldest → newest
}

export const SEED_FUNDAMENTALS: Fundamentals[] = SEED_COMPANIES.map(fundamentalsFor);
export const SEED_QUOTES: Quote[] = SEED_COMPANIES.map(quoteFor);
export const SEED_DIVIDENDS: Dividend[] = SEED_COMPANIES.flatMap(dividendsFor);
