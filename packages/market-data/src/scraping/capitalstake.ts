import type { Quote } from '@psx/shared';
import * as cheerio from 'cheerio';

/**
 * CapitalStake scraper (data source: https://www.capitalstake.com). Best-effort
 * and resilient: returns [] on any network/parse failure so callers fall back.
 * Selectors are heuristic and may need updating if the site changes.
 */

const DEFAULT_BASE = 'https://www.capitalstake.com';

function toNumber(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export function parseCapitalStake(html: string): Quote[] {
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
    const nums = cells.slice(1).map(toNumber);
    const price = nums.find((n) => Number.isFinite(n) && n > 0);
    if (price == null) return;
    const change = nums.find((n, i) => i > 0 && Number.isFinite(n)) ?? 0;
    const changePercent = price > 0 ? Math.round((change / price) * 10000) / 100 : 0;
    quotes.push({ symbol, price, change, changePercent, asOf });
  });

  return quotes;
}

export async function scrapeCapitalStake(baseUrl: string = DEFAULT_BASE): Promise<Quote[]> {
  try {
    const res = await fetch(`${baseUrl}/market`, {
      headers: { 'user-agent': 'psx-wealth-builder/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return parseCapitalStake(await res.text());
  } catch {
    return [];
  }
}
