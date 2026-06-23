/**
 * PSX market-watch fetcher. Source: the official PSX data portal
 * (https://dps.psx.com.pk/market-watch). Parsing lives in ../sync/constituents.
 */
const DEFAULT_BASE = 'https://dps.psx.com.pk';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

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
