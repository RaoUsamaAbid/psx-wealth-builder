import { buildUniverseFromMarketWatch, fetchPsxMarketWatchHtml } from '@psx/market-data';
import type { Repositories, SyncStatus } from '../repositories.js';

const SYNC_KEY = 'marketSync';

export type HtmlFetcher = () => Promise<string | null>;

/**
 * Scrape the PSX market-watch page and replace the DB universe with the live
 * Shariah-compliant constituents (KMI30 + KMI All-Share) and their real prices.
 * Fundamentals/dividends are regenerated from the real prices (placeholder until
 * a deep sync). Stale names (e.g. companies that left the Shariah index) are
 * pruned so the universe stays exactly the live set.
 *
 * `fetchHtml` is injectable so tests can run against a fixture (no network).
 */
export async function runMarketSync(
  repos: Repositories,
  fetchHtml: HtmlFetcher = fetchPsxMarketWatchHtml
): Promise<SyncStatus> {
  const start = Date.now();
  const html = await fetchHtml();
  if (!html) throw new Error('could not fetch PSX market-watch (network/page error)');

  const u = buildUniverseFromMarketWatch(html, new Date().toISOString());
  if (u.companies.length === 0) {
    throw new Error('no Shariah companies parsed — PSX page format may have changed');
  }

  await repos.companies.upsertMany(u.companies);
  await repos.quotes.upsertMany(u.quotes);
  await repos.fundamentals.upsertMany(u.fundamentals);
  await repos.dividends.upsertMany(u.dividends);

  // Prune anything no longer in the live Shariah universe.
  const symbols = u.companies.map((c) => c.symbol);
  await Promise.all([
    repos.companies.deleteNotIn(symbols),
    repos.quotes.deleteNotIn(symbols),
    repos.fundamentals.deleteNotIn(symbols),
    repos.dividends.deleteNotIn(symbols),
  ]);

  const status: SyncStatus = {
    lastSyncedAt: u.asOf,
    companies: u.companies.length,
    quotes: u.quotes.length,
    durationMs: Date.now() - start,
    source: 'psx-market-watch',
  };
  await repos.meta.set(SYNC_KEY, status);
  return status;
}

export async function getSyncStatus(repos: Repositories): Promise<SyncStatus | null> {
  return repos.meta.get<SyncStatus>(SYNC_KEY);
}
