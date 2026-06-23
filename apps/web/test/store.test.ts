import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanner, DEFAULT_REQUEST } from '../src/store/planner';

describe('planner store', () => {
  beforeEach(() => {
    usePlanner.setState({ request: DEFAULT_REQUEST, applied: false });
  });

  it('starts un-applied with sensible defaults', () => {
    const s = usePlanner.getState();
    expect(s.applied).toBe(false);
    expect(s.request.strategy).toBe('balanced');
    expect(s.request.monthlyInvestmentAmount).toBeGreaterThan(0);
  });

  it('apply() stores the request and marks applied', () => {
    const req = {
      ...DEFAULT_REQUEST,
      strategy: 'dividend' as const,
      monthlyInvestmentAmount: 80000,
    };
    usePlanner.getState().apply(req);
    const s = usePlanner.getState();
    expect(s.applied).toBe(true);
    expect(s.request.strategy).toBe('dividend');
    expect(s.request.monthlyInvestmentAmount).toBe(80000);
  });
});
