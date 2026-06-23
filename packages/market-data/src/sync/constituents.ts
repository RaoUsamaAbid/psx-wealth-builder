import * as cheerio from 'cheerio';

/**
 * Richer parse of the PSX market-watch page for the sync flow. Beyond price, it
 * extracts the company name (the symbol anchor's `data-title`), the sector code,
 * and index membership from the `listed` column.
 *
 * PSX exposes `KMI30` (the 30 blue-chip Shariah names) and `KMIALLSHR` (KMI All
 * Share — the full Shariah-compliant universe) but NOT a literal `KMI100`. Since
 * this product targets Shariah-compliant companies, we treat KMIALLSHR
 * membership as the broad Shariah tier and KMI30 as the focused tier.
 */
export interface PsxConstituent {
  symbol: string;
  companyName: string;
  sectorCode: string;
  isKmi30: boolean;
  isShariah: boolean; // in KMI30 or KMIALLSHR
  price: number;
  change: number;
  changePercent: number;
}

function order(rawAttr: string | undefined, text: string): number {
  const src = rawAttr != null && rawAttr !== '' ? rawAttr : text;
  const n = Number(src.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export function parsePsxConstituents(html: string): PsxConstituent[] {
  const $ = cheerio.load(html);
  const table = $('table.tbl').first().length ? $('table.tbl').first() : $('table').first();
  if (!table.length) return [];

  const col: Record<string, number> = {};
  table.find('thead th').each((i, th) => {
    const name = $(th).attr('data-name');
    if (name) col[name] = i;
  });
  const symbolIdx = col.symbol ?? 0;
  const listedIdx = col.listed;
  const sectorIdx = col.sector;
  const closeIdx = col.close;
  const changeIdx = col.change;
  const pctIdx = col.percentChange;
  if (closeIdx == null || listedIdx == null) return [];

  const out: PsxConstituent[] = [];
  table.find('tbody tr').each((_, row) => {
    const tds = $(row).find('td');
    if (tds.length <= closeIdx) return;

    const symbolCell = $(tds[symbolIdx]);
    const symbol = symbolCell.text().trim().toUpperCase();
    if (!symbol || !/^[A-Z0-9.&-]{1,12}$/.test(symbol)) return;

    const price = order($(tds[closeIdx]).attr('data-order'), $(tds[closeIdx]).text());
    if (!Number.isFinite(price) || price <= 0) return;

    const tokens = $(tds[listedIdx])
      .text()
      .split(',')
      .map((t) => t.trim().toUpperCase());
    const isKmi30 = tokens.includes('KMI30');
    const isShariah = isKmi30 || tokens.includes('KMIALLSHR');

    out.push({
      symbol,
      companyName: symbolCell.find('a').attr('data-title')?.trim() || symbol,
      sectorCode: sectorIdx != null ? $(tds[sectorIdx]).text().trim() : '',
      isKmi30,
      isShariah,
      price,
      change:
        changeIdx != null
          ? order($(tds[changeIdx]).attr('data-order'), $(tds[changeIdx]).text()) || 0
          : 0,
      changePercent:
        pctIdx != null ? order($(tds[pctIdx]).attr('data-order'), $(tds[pctIdx]).text()) || 0 : 0,
    });
  });

  return out;
}
