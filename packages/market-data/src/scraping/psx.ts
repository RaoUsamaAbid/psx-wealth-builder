import type { Quote } from '@psx/shared';
import * as cheerio from 'cheerio';

/**
 * PSX market-watch scraper. Source: the official PSX data portal
 * (https://dps.psx.com.pk/market-watch).
 *
 * The page renders one `<table class="tbl">` whose header cells carry
 * `data-name` attributes (symbol, sector, listed, ldcp, open, high, low, close,
 * change, percentChange, volume) and whose numeric body cells carry a precise
 * machine-readable `data-order` attribute. We map columns by `data-name` (so a
 * column re-order can't silently corrupt values) and read `data-order` (so
 * icons, commas and `%` in the visible text never pollute the numbers).
 *
 * Everything is best-effort and resilient: any failure yields `[]` and callers
 * fall back to another provider.
 */

const DEFAULT_BASE = 'https://dps.psx.com.pk';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function orderNumber(rawAttr: string | undefined, fallbackText: string): number {
  const source = rawAttr != null && rawAttr !== '' ? rawAttr : fallbackText;
  const n = Number(source.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Parse the PSX market-watch HTML into quotes. Pure + deterministic (used by
 * the scraper and by fixture-based tests).
 */
export function parsePsxMarketWatch(html: string, asOf = new Date().toISOString()): Quote[] {
  const $ = cheerio.load(html);
  const table = $('table.tbl').first().length ? $('table.tbl').first() : $('table').first();
  if (!table.length) return [];

  // Map header data-name → column index.
  const colIndex: Record<string, number> = {};
  table.find('thead th').each((i, th) => {
    const name = $(th).attr('data-name');
    if (name) colIndex[name] = i;
  });

  const symbolIdx = colIndex.symbol ?? 0;
  const closeIdx = colIndex.close;
  const changeIdx = colIndex.change;
  const pctIdx = colIndex.percentChange;
  if (closeIdx == null) return []; // structure not as expected

  const quotes: Quote[] = [];
  table.find('tbody tr').each((_, row) => {
    const tds = $(row).find('td');
    if (tds.length <= closeIdx) return;

    const symbol = $(tds[symbolIdx]).text().trim().toUpperCase();
    if (!symbol || !/^[A-Z0-9.&-]{1,12}$/.test(symbol)) return;

    const closeCell = $(tds[closeIdx]);
    const price = orderNumber(closeCell.attr('data-order'), closeCell.text());
    if (!Number.isFinite(price) || price <= 0) return;

    const change =
      changeIdx != null
        ? orderNumber($(tds[changeIdx]).attr('data-order'), $(tds[changeIdx]).text())
        : 0;
    const changePercent =
      pctIdx != null ? orderNumber($(tds[pctIdx]).attr('data-order'), $(tds[pctIdx]).text()) : 0;

    quotes.push({
      symbol,
      price,
      change: Number.isFinite(change) ? change : 0,
      changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      asOf,
    });
  });

  return quotes;
}

/** Fetch the raw market-watch HTML. Returns null on any network error. */
export async function fetchPsxMarketWatchHtml(
  baseUrl: string = DEFAULT_BASE
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/market-watch`, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Fetch + parse PSX market watch. Returns [] on any network/parse error. */
export async function scrapePsx(baseUrl: string = DEFAULT_BASE): Promise<Quote[]> {
  const html = await fetchPsxMarketWatchHtml(baseUrl);
  return html ? parsePsxMarketWatch(html) : [];
}
