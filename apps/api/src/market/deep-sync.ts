import { parsePsxCompany, fetchPsxCompanyHtml } from '@psx/market-data';
import type { Repositories } from '../repositories.js';

const DEEP_KEY = 'marketDeepSync';
const DEFAULT_DELAY_MS = 250; // politeness between company-page requests
const PROGRESS_EVERY = 10;

export interface DeepSyncStatus {
  running: boolean;
  total: number;
  processed: number;
  updated: number;
  startedAt: string;
  finishedAt: string | null;
  lastError: string | null;
}

export type CompanyHtmlFetcher = (symbol: string) => Promise<string | null>;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// In-process guard so a second trigger can't run concurrently.
let inFlight = false;

export async function getDeepSyncStatus(repos: Repositories): Promise<DeepSyncStatus | null> {
  return repos.meta.get<DeepSyncStatus>(DEEP_KEY);
}

export function isDeepSyncRunning(): boolean {
  return inFlight;
}

export interface DeepSyncOptions {
  fetchCompanyHtml?: CompanyHtmlFetcher;
  delayMs?: number;
  now?: () => number;
}

/**
 * Deep sync: walk every company in the DB, scrape its PSX company page, and
 * UPSERT real fundamentals (sector, market cap, P/E, EPS, EPS growth, revenue
 * growth). Never prunes — existing rows are updated in place, new fields filled.
 * Long-running; callers start it in the background and poll the status.
 */
export async function runDeepSync(repos: Repositories, opts: DeepSyncOptions = {}): Promise<void> {
  const fetchHtml = opts.fetchCompanyHtml ?? fetchPsxCompanyHtml;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const now = opts.now ?? Date.now;

  if (inFlight) return;
  inFlight = true;

  const companies = await repos.companies.findAll();
  const status: DeepSyncStatus = {
    running: true,
    total: companies.length,
    processed: 0,
    updated: 0,
    startedAt: new Date(now()).toISOString(),
    finishedAt: null,
    lastError: null,
  };
  await repos.meta.set(DEEP_KEY, status);

  try {
    for (const c of companies) {
      try {
        const html = await fetchHtml(c.symbol);
        if (html) {
          const d = parsePsxCompany(html);

          const patch: Partial<typeof c> = {};
          if (d.sector) patch.sector = d.sector;
          if (d.marketCap && d.marketCap > 0) patch.marketCap = d.marketCap;
          if (d.companyName) patch.companyName = d.companyName;
          if (Object.keys(patch).length) await repos.companies.upsertMany([{ ...c, ...patch }]);

          const f = await repos.fundamentals.findBySymbol(c.symbol);
          if (f) {
            const updated = { ...f };
            if (d.eps != null && d.eps > 0) updated.eps = d.eps;
            if (d.peRatio != null && d.peRatio > 0) updated.peRatio = d.peRatio;
            if (d.epsGrowth != null) updated.epsGrowth = clamp(d.epsGrowth, -0.9, 5);
            if (d.revenueGrowth != null) updated.revenueGrowth = clamp(d.revenueGrowth, -0.9, 5);
            updated.asOf = new Date(now()).toISOString();
            await repos.fundamentals.upsertMany([updated]);
            status.updated++;
          }
        }
      } catch (err) {
        status.lastError = err instanceof Error ? err.message : 'company sync error';
      }

      status.processed++;
      if (status.processed % PROGRESS_EVERY === 0) await repos.meta.set(DEEP_KEY, status);
      await delay(delayMs);
    }
  } finally {
    status.running = false;
    status.finishedAt = new Date(now()).toISOString();
    await repos.meta.set(DEEP_KEY, status);
    inFlight = false;
  }
}
