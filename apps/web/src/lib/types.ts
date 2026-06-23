import type {
  Company,
  Dividend,
  DividendForecast,
  Fundamentals,
  HealthScore,
  MonthlyRecommendation,
  Portfolio,
  PortfolioRequest,
  Quote,
  RebalanceResult,
  SipResult,
  WealthProjection,
} from '@psx/shared';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface CompaniesResponse {
  count: number;
  companies: Company[];
}
export interface CompanyDetail {
  company: Company;
  fundamentals: Fundamentals | null;
  dividends: Dividend[];
  quote: Quote | null;
}

export type MarketStatus = 'live' | 'simulated' | 'stale' | 'down';
export interface MarketSnapshot {
  source: string;
  status: MarketStatus;
  lastUpdated: string | null;
  freshnessMs: number;
  count: number;
  quotes?: Quote[];
}

export type SipResponse = SipResult & { request: PortfolioRequest };
export interface DividendsResponse {
  request: PortfolioRequest;
  years: number;
  reinvestOff: DividendForecast;
  reinvestOn: DividendForecast;
}
export type ProjectionResponse = WealthProjection;
export interface HealthResponse {
  request: PortfolioRequest;
  portfolio: Portfolio;
  health: HealthScore;
}
export type RebalanceResponse = RebalanceResult;
export type RecommendationResponse = MonthlyRecommendation;

export interface SyncStatus {
  lastSyncedAt: string;
  companies: number;
  quotes: number;
  durationMs: number;
  source: string;
}

export interface DeepSyncStatus {
  running: boolean;
  total: number;
  processed: number;
  updated: number;
  startedAt: string;
  finishedAt: string | null;
  lastError: string | null;
}

export interface SyncStatusResponse {
  sync: SyncStatus | null;
  deep: DeepSyncStatus | null;
}

export interface SavedPortfolio {
  id: string;
  name: string;
  request: PortfolioRequest;
  createdAt: string;
}
export interface WatchItem {
  symbol: string;
  createdAt: string;
}
export interface HistoryItem {
  id: string;
  symbol: string;
  shares: number;
  price: number;
  date: string;
  note?: string;
  createdAt: string;
}

export type SipPlanStatus = 'active' | 'paused' | 'completed';

export interface PersonalSipPlan {
  id: string;
  name: string;
  request: PortfolioRequest;
  carriedCash: number;
  estimatedFeeRate: number;
  maxOrders: number;
  nextInvestmentDate: string | null;
  lastInvestedAt: string | null;
  status: SipPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SipHolding {
  symbol: string;
  shares: number;
}

export interface SipTransaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'fee';
  symbol?: string;
  shares?: number;
  price?: number;
  amount: number;
  fees: number;
  date: string;
  note?: string;
}

export interface PersonalSipDetail {
  plan: PersonalSipPlan;
  holdings: SipHolding[];
  transactions: SipTransaction[];
}
