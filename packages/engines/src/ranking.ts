import type { ScoredCompany } from '@psx/shared';

export interface SelectionOptions {
  count: number; // target number of holdings
  maxPerSector: number; // diversification cap per sector
}

/**
 * Pick the portfolio holdings from a scored, descending list. Greedy by score
 * with a per-sector cap for diversification; if the cap leaves us short of the
 * target count, backfill with the next-best names regardless of sector.
 */
export function selectHoldings(scored: ScoredCompany[], opts: SelectionOptions): ScoredCompany[] {
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const perSector = new Map<string, number>();
  const picked: ScoredCompany[] = [];
  const skipped: ScoredCompany[] = [];

  for (const sc of ranked) {
    if (picked.length >= opts.count) break;
    const used = perSector.get(sc.company.sector) ?? 0;
    if (used < opts.maxPerSector) {
      picked.push(sc);
      perSector.set(sc.company.sector, used + 1);
    } else {
      skipped.push(sc);
    }
  }

  // Backfill if the sector cap left us short.
  for (const sc of skipped) {
    if (picked.length >= opts.count) break;
    picked.push(sc);
  }

  return picked;
}
