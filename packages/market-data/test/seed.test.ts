import { describe, it, expect } from 'vitest';
import { SEED_COMPANIES } from '@psx/market-data';

describe('seed companies', () => {
  it('every seed company is Shariah-compliant and KMI-indexed', () => {
    expect(SEED_COMPANIES.length).toBeGreaterThanOrEqual(40);
    for (const c of SEED_COMPANIES) {
      expect(c.shariahCompliant).toBe(true);
      expect(c.indices).toContain('KMI100');
      expect(c.marketCap).toBeGreaterThan(0);
    }
  });

  it('has exactly 30 KMI30 names, all also in KMI100', () => {
    const kmi30 = SEED_COMPANIES.filter((c) => c.indices.includes('KMI30'));
    expect(kmi30.length).toBe(30);
    for (const c of kmi30) expect(c.indices).toContain('KMI100');
  });

  it('symbols are unique', () => {
    const set = new Set(SEED_COMPANIES.map((c) => c.symbol));
    expect(set.size).toBe(SEED_COMPANIES.length);
  });
});
