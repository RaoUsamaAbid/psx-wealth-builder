/**
 * @psx/market-data — provider abstraction + PSX scrapers.
 * RULE: business logic NEVER calls a third-party API/scraper directly; it goes
 * through MarketDataProvider (the DB-backed implementation lives in the API).
 * Market data is pulled on demand (scrape-on-sync), never polled.
 */
export type { MarketDataProvider } from './provider.js';

export * from './seed/index.js';

export { fetchPsxMarketWatchHtml } from './scraping/psx.js';
export { parsePsxConstituents, type PsxConstituent } from './sync/constituents.js';
export { buildUniverseFromMarketWatch, buildSectorMap, type SyncedUniverse } from './sync/sync.js';
export {
  parsePsxCompany,
  fetchPsxCompanyHtml,
  type PsxCompanyDetails,
} from './scraping/company.js';
