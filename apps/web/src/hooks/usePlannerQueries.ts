import { useQuery } from '@tanstack/react-query';
import type { PortfolioRequest, Portfolio } from '@psx/shared';
import { api } from '../lib/api';
import type {
  DividendsResponse,
  HealthResponse,
  ProjectionResponse,
  RecommendationResponse,
  SipResponse,
} from '../lib/types';

const key = (name: string, req: PortfolioRequest, extra?: unknown) => [name, req, extra];

export function usePortfolio(req: PortfolioRequest, enabled: boolean) {
  return useQuery({
    queryKey: key('portfolio', req),
    enabled,
    queryFn: () => api<Portfolio>('/portfolio', { method: 'POST', body: req }),
  });
}

export function useHealth(req: PortfolioRequest, enabled: boolean) {
  return useQuery({
    queryKey: key('health', req),
    enabled,
    queryFn: () => api<HealthResponse>('/portfolio-health', { method: 'POST', body: req }),
  });
}

export function useSip(req: PortfolioRequest, enabled: boolean) {
  return useQuery({
    queryKey: key('sip', req),
    enabled,
    queryFn: () => api<SipResponse>('/sip', { method: 'POST', body: req }),
  });
}

export function useDividends(req: PortfolioRequest, enabled: boolean) {
  return useQuery({
    queryKey: key('dividends', req),
    enabled,
    queryFn: () => api<DividendsResponse>('/dividends', { method: 'POST', body: req }),
  });
}

export function useProjection(req: PortfolioRequest, enabled: boolean, targetValue?: number) {
  return useQuery({
    queryKey: key('projection', req, targetValue),
    enabled,
    queryFn: () =>
      api<ProjectionResponse>('/projection', {
        method: 'POST',
        body: { ...req, targetValue: targetValue && targetValue > 0 ? targetValue : undefined },
      }),
  });
}

export interface RecommendationInputs {
  carriedCash: number;
  availableDividends: number;
  estimatedFeeRate: number;
  maxOrders: number;
}

export function useRecommendation(
  req: PortfolioRequest,
  enabled: boolean,
  inputs: RecommendationInputs
) {
  return useQuery({
    queryKey: key('recommendation', req, inputs),
    enabled,
    queryFn: () =>
      api<RecommendationResponse>('/recommendations/monthly', {
        method: 'POST',
        body: { ...req, ...inputs },
      }),
  });
}
