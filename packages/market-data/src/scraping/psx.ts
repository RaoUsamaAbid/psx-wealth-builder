import type { Quote } from '@psx/shared';
import * as cheerio from 'cheerio';

/**
 * PSX market-watch scraper (data source: official PSX data portal,
 * https://dps.psx.com.pk/market-watch). HTML structure can change and the
 * network may be unreachable, so every entry point is best-effort and returns
 * an empty array on any failure — callers fall back to another provider.
 */

const DEFAULT_BASE = 'https://dps.psx.com.pk';

function toNumber(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/** Parse the PSX market-watch HTML table into quotes. Pure + testable. */
export function parsePsxMarketWatch(html: string): Quote[] {
  const $ = cheerio.load(html);
  const asOf = new Date().toISOString();
  const quotes: Quote[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .map((_i, c) => $(c).text().trim())
      .get();
    if (cells.length < 2) return;
    const symbol = (cells[0] ?? '').toUpperCase();
    if (!symbol || !/^[A-Z0-9.&-]{1,12}$/.test(symbol)) return;

    // Heuristic: find the current price and the change among the numeric cells.
    const nums = cells.slice(1).map(toNumber);
    const price = nums.find((n) => Number.isFinite(n) && n > 0);
    if (price == null || !Number.isFinite(price)) return;
    const change = nums.find((n, i) => i > 0 && Number.isFinite(n)) ?? 0;
    const changePercent = price > 0 ? Math.round((change / price) * 10000) / 100 : 0;
    quotes.push({ symbol, price, change, changePercent, asOf });
  });

  return quotes;
}

/** Fetch + parse PSX market watch. Returns [] on any network/parse error. */
export async function scrapePsx(baseUrl: string = DEFAULT_BASE): Promise<Quote[]> {
  try {
    const res = await fetch(`${baseUrl}/market-watch`, {
      headers: { 'user-agent': 'psx-wealth-builder/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return parsePsxMarketWatch(await res.text());
  } catch {
    return [];
  }
}
