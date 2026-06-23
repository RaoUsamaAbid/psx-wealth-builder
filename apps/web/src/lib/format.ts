const PKR = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });

/** Compact PKR, e.g. 44.7M, 1.2B. */
export function pkrCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `PKR ${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `PKR ${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `PKR ${(n / 1e3).toFixed(1)}K`;
  return `PKR ${PKR.format(n)}`;
}

export function pkr(n: number): string {
  return `PKR ${PKR.format(n)}`;
}

export function num(n: number): string {
  return PKR.format(n);
}

/** Fraction → percent string, e.g. 0.0705 → "7.05%". */
export function pctFromFraction(f: number, dp = 2): string {
  return `${(f * 100).toFixed(dp)}%`;
}

/** Already-percent number → string, e.g. 7.05 → "7.05%". */
export function pct(n: number, dp = 2): string {
  return `${n.toFixed(dp)}%`;
}

export function signedPct(n: number, dp = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(dp)}%`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0 || Number.isNaN(ms)) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
