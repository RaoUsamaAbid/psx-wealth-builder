import * as cheerio from 'cheerio';

/**
 * Per-company page scraper (https://dps.psx.com.pk/company/<symbol>). Extracts
 * the REAL fundamentals the market-watch page lacks: sector name, market cap,
 * shares, P/E, latest EPS, EPS growth and revenue growth (from the annual
 * financials + ratios tables). Best-effort: any field that can't be found is
 * left undefined and the caller keeps its existing/estimated value.
 */

const DEFAULT_BASE = 'https://dps.psx.com.pk';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

export interface PsxCompanyDetails {
  companyName?: string;
  sector?: string;
  marketCap?: number; // PKR
  shares?: number;
  peRatio?: number;
  eps?: number;
  epsGrowth?: number; // fraction
  revenueGrowth?: number; // fraction
}

/** Parse "(18.71)" → -18.71, "1,437,585,317.70" → 1437585317.7. NaN if empty. */
function parseNumber(text: string): number {
  const t = text.trim();
  if (!t) return NaN;
  const neg = /^\(.*\)$/.test(t);
  const n = Number(t.replace(/[(),]/g, '').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return NaN;
  return neg ? -n : n;
}

/** "OIL & GAS EXPLORATION COMPANIES" → "Oil & Gas Exploration". */
function normalizeSector(raw: string): string {
  const cleaned = raw
    .replace(/&amp;/g, '&')
    .replace(/\b(COMPANIES|COMPANY)\b/gi, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return cleaned
    .split(' ')
    .map((w) => (w === '&' ? '&' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .trim();
}

export function parsePsxCompany(html: string): PsxCompanyDetails {
  const $ = cheerio.load(html);
  const out: PsxCompanyDetails = {};

  const name = $('.quote__name').first().text().trim();
  if (name) out.companyName = name.replace(/&amp;/g, '&');
  const sector = $('.quote__sector').first().text().trim();
  if (sector) out.sector = normalizeSector(sector);

  // Labelled stat pairs.
  const stats = new Map<string, string>();
  $('.stats_label').each((_, el) => {
    const label = $(el).text().trim();
    const value = $(el).next('.stats_value').text().trim();
    if (label) stats.set(label, value);
  });
  const stat = (re: RegExp): number => {
    for (const [k, v] of stats) if (re.test(k)) return parseNumber(v);
    return NaN;
  };
  const marketCapK = stat(/market cap/i); // in thousands
  if (Number.isFinite(marketCapK)) out.marketCap = Math.round(marketCapK * 1000);
  const shares = stat(/^shares/i);
  if (Number.isFinite(shares)) out.shares = shares;
  const pe = stat(/p\/e ratio/i);
  if (Number.isFinite(pe) && pe > 0) out.peRatio = pe;

  // Year-keyed tables: find the row whose first cell matches `label`.
  const rowValues = (label: RegExp): number[] => {
    let found: number[] = [];
    $('table tbody tr').each((_, tr) => {
      if (found.length) return;
      const cells = $(tr).find('td');
      if (cells.length < 2) return;
      const head = $(cells[0]).text().trim();
      if (label.test(head)) {
        found = cells
          .slice(1)
          .map((_i, c) => parseNumber($(c).text()))
          .get();
      }
    });
    return found;
  };

  const epsRow = rowValues(/^eps$/i);
  if (epsRow[0] != null && Number.isFinite(epsRow[0])) out.eps = epsRow[0];

  const epsGrowthRow = rowValues(/eps growth/i);
  if (epsGrowthRow[0] != null && Number.isFinite(epsGrowthRow[0])) {
    out.epsGrowth = epsGrowthRow[0] / 100;
  }

  const sales = rowValues(/^(sales|revenue|net sales|turnover)/i);
  if (sales.length >= 2 && sales[0]! > 0 && sales[1]! > 0) {
    out.revenueGrowth = sales[0]! / sales[1]! - 1;
  }

  return out;
}

/** Fetch a company page. Returns null on any network error. */
export async function fetchPsxCompanyHtml(
  symbol: string,
  baseUrl: string = DEFAULT_BASE
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/company/${encodeURIComponent(symbol)}`, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
