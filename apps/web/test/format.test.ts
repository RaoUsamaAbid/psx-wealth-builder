import { describe, it, expect } from 'vitest';
import { pkrCompact, pkr, pct, signedPct, pctFromFraction, timeAgo } from '../src/lib/format';
import { cn } from '../src/lib/cn';

describe('format helpers', () => {
  it('pkrCompact abbreviates by magnitude', () => {
    expect(pkrCompact(44_700_000)).toBe('PKR 44.70M');
    expect(pkrCompact(1_200_000_000)).toBe('PKR 1.20B');
    expect(pkrCompact(5000)).toBe('PKR 5.0K');
  });
  it('pkr formats whole rupees', () => {
    expect(pkr(50000)).toMatch(/PKR\s*50,000/);
  });
  it('pct + signedPct format percentages', () => {
    expect(pct(7.05)).toBe('7.05%');
    expect(signedPct(12.3)).toBe('+12.30%');
    expect(signedPct(-4)).toBe('-4.00%');
  });
  it('pctFromFraction converts fractions', () => {
    expect(pctFromFraction(0.0705)).toBe('7.05%');
  });
  it('timeAgo handles null and recent times', () => {
    expect(timeAgo(null)).toBe('—');
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });
});

describe('cn', () => {
  it('merges and dedupes tailwind classes', () => {
    const hidden = false as boolean;
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-white', hidden && 'hidden', 'font-bold')).toBe('text-white font-bold');
  });
});
