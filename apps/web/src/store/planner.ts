import { create } from 'zustand';
import type { PortfolioRequest } from '@psx/shared';

export const DEFAULT_REQUEST: PortfolioRequest = {
  monthlyInvestmentAmount: 50000,
  durationYears: 15,
  strategy: 'balanced',
  riskLevel: 'medium',
  holdingsCount: 10,
  maxPerSector: 2,
};

interface PlannerState {
  request: PortfolioRequest;
  applied: boolean;
  setRequest: (r: PortfolioRequest) => void;
  apply: (r: PortfolioRequest) => void;
}

export const usePlanner = create<PlannerState>((set) => ({
  request: DEFAULT_REQUEST,
  applied: false,
  setRequest: (request) => set({ request }),
  apply: (request) => set({ request, applied: true }),
}));
