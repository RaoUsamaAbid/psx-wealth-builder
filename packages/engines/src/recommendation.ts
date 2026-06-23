import type {
  CompanyData,
  LedgerHolding,
  MonthlyBuyOrder,
  MonthlyRecommendation,
  PortfolioRequest,
  RecommendationConfidence,
} from '@psx/shared';
import { generatePortfolio } from './portfolio.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MonthlyRecommendationOptions {
  carriedCash?: number;
  availableDividends?: number;
  estimatedFeeRate?: number;
  maxOrders?: number;
  quoteMaxAgeMs?: number;
  validForMs?: number;
  now?: Date;
}

interface Candidate {
  symbol: string;
  companyName: string;
  sector: string;
  score: number;
  price: number;
  targetWeight: number;
  targetValue: number;
  currentShares: number;
  currentValue: number;
  deficit: number;
  sharesToBuy: number;
}

function confidenceFor(
  data: CompanyData | undefined,
  quoteFresh: boolean,
  nowMs: number
): RecommendationConfidence {
  if (!data?.quote || !data.fundamentals || !quoteFresh) return 'low';
  const age = nowMs - Date.parse(data.fundamentals.asOf);
  return Number.isFinite(age) && age <= 90 * DAY_MS ? 'medium' : 'low';
}

function lowerConfidence(
  a: RecommendationConfidence,
  b: RecommendationConfidence
): RecommendationConfidence {
  const rank: Record<RecommendationConfidence, number> = { low: 0, medium: 1, high: 2 };
  return rank[a] <= rank[b] ? a : b;
}

/**
 * Convert a target portfolio into exact whole-share orders for this month.
 *
 * Existing holdings are valued at current quotes. The engine calculates each
 * target holding's PKR deficit after adding this month's available cash, limits
 * the plan to the largest deficits, then buys one share at a time from the most
 * underweight affordable candidate. This minimizes drift without overspending.
 */
export function recommendMonthlyBuys(
  universe: CompanyData[],
  request: PortfolioRequest,
  currentHoldings: LedgerHolding[],
  options: MonthlyRecommendationOptions = {}
): MonthlyRecommendation {
  const now = options.now ?? new Date();
  const carriedCash = Math.max(0, options.carriedCash ?? 0);
  const availableDividends = Math.max(0, options.availableDividends ?? 0);
  const estimatedFeeRate = Math.max(0, Math.min(0.1, options.estimatedFeeRate ?? 0));
  const maxOrders = Math.max(1, Math.min(10, Math.round(options.maxOrders ?? 4)));
  const quoteMaxAgeMs = Math.max(60_000, options.quoteMaxAgeMs ?? DAY_MS);
  const validForMs = Math.max(60_000, options.validForMs ?? 30 * 60_000);
  const availableCash = round2(request.monthlyInvestmentAmount + carriedCash + availableDividends);

  const bySymbol = new Map(universe.map((d) => [d.company.symbol, d]));
  const sharesBySymbol = new Map<string, number>();
  for (const holding of currentHoldings) {
    if (!Number.isFinite(holding.shares) || holding.shares <= 0) continue;
    sharesBySymbol.set(holding.symbol, (sharesBySymbol.get(holding.symbol) ?? 0) + holding.shares);
  }

  const currentPortfolioValue = round2(
    [...sharesBySymbol.entries()].reduce((sum, [symbol, shares]) => {
      return sum + shares * (bySymbol.get(symbol)?.quote?.price ?? 0);
    }, 0)
  );
  const projectedPortfolioValue = round2(currentPortfolioValue + availableCash);
  const target = generatePortfolio(universe, request, now);

  const warnings: string[] = [
    'Dividend, debt, beta, ROE and book-value inputs may still contain estimates.',
    'Verify prices, company filings, Shariah status, taxes and brokerage charges before trading.',
  ];
  const staleSymbols: string[] = [];
  let dataConfidence: RecommendationConfidence = 'medium';

  const allCandidates: Candidate[] = target.holdings.flatMap((holding) => {
    const data = bySymbol.get(holding.symbol);
    const price = data?.quote?.price ?? 0;
    if (price <= 0) return [];
    const quoteTime = Date.parse(data!.quote!.asOf);
    const quoteFresh = Number.isFinite(quoteTime) && now.getTime() - quoteTime <= quoteMaxAgeMs;
    if (!quoteFresh) staleSymbols.push(holding.symbol);
    dataConfidence = lowerConfidence(
      dataConfidence,
      confidenceFor(data, quoteFresh, now.getTime())
    );

    const currentShares = sharesBySymbol.get(holding.symbol) ?? 0;
    const currentValue = currentShares * price;
    const targetWeight = holding.allocationPercent / 100;
    const targetValue = projectedPortfolioValue * targetWeight;
    return [
      {
        symbol: holding.symbol,
        companyName: holding.companyName,
        sector: holding.sector,
        score: holding.score,
        price,
        targetWeight,
        targetValue,
        currentShares,
        currentValue,
        deficit: Math.max(0, targetValue - currentValue),
        sharesToBuy: 0,
      },
    ];
  });

  const selected = allCandidates
    .filter((candidate) => candidate.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || b.score - a.score)
    .slice(0, maxOrders);

  let cash = availableCash;
  while (selected.length > 0) {
    const affordable = selected
      .filter((candidate) => {
        const remainingDeficit = candidate.deficit - candidate.sharesToBuy * candidate.price;
        return remainingDeficit > 0 && candidate.price * (1 + estimatedFeeRate) <= cash + 0.001;
      })
      .sort((a, b) => {
        const aGap = Math.max(0, a.deficit - a.sharesToBuy * a.price) / Math.max(1, a.targetValue);
        const bGap = Math.max(0, b.deficit - b.sharesToBuy * b.price) / Math.max(1, b.targetValue);
        return bGap - aGap || b.score - a.score;
      });
    const next = affordable[0];
    if (!next) break;
    const unitCost = next.price * (1 + estimatedFeeRate);
    next.sharesToBuy++;
    cash -= unitCost;
  }

  const orders: MonthlyBuyOrder[] = selected
    .filter((candidate) => candidate.sharesToBuy > 0)
    .map((candidate) => {
      const data = bySymbol.get(candidate.symbol);
      const quoteTime = Date.parse(data?.quote?.asOf ?? '');
      const quoteFresh = Number.isFinite(quoteTime) && now.getTime() - quoteTime <= quoteMaxAgeMs;
      const confidence = confidenceFor(data, quoteFresh, now.getTime());
      const grossCost = round2(candidate.sharesToBuy * candidate.price);
      const estimatedFees = round2(grossCost * estimatedFeeRate);
      return {
        symbol: candidate.symbol,
        companyName: candidate.companyName,
        sector: candidate.sector,
        shares: candidate.sharesToBuy,
        referencePrice: round2(candidate.price),
        grossCost,
        estimatedFees,
        estimatedTotal: round2(grossCost + estimatedFees),
        score: candidate.score,
        confidence,
        currentShares: candidate.currentShares,
        currentValue: round2(candidate.currentValue),
        targetWeight: round2(candidate.targetWeight * 100),
        targetValue: round2(candidate.targetValue),
        valueDeficitBefore: round2(candidate.deficit),
        reasons: [
          candidate.currentShares === 0
            ? 'Not currently held; selected for the target portfolio.'
            : 'Currently below its target portfolio value.',
          `Strategy score ${candidate.score.toFixed(1)} / 100.`,
          `Target allocation ${round2(candidate.targetWeight * 100)}%.`,
        ],
      };
    });

  const grossOrderValue = round2(orders.reduce((sum, order) => sum + order.grossCost, 0));
  const estimatedFees = round2(orders.reduce((sum, order) => sum + order.estimatedFees, 0));
  const estimatedTotal = round2(grossOrderValue + estimatedFees);
  const remainingCash = round2(Math.max(0, availableCash - estimatedTotal));

  if (staleSymbols.length > 0) {
    warnings.unshift(`Stale reference prices: ${[...new Set(staleSymbols)].join(', ')}.`);
  }
  if (estimatedFeeRate === 0) {
    warnings.push('Trading costs are excluded because the estimated fee rate is 0%.');
  }
  if (orders.length === 0) {
    warnings.unshift('No affordable target shares were found for the available cash.');
  }

  return {
    request,
    asOf: now.toISOString(),
    expiresAt: new Date(now.getTime() + validForMs).toISOString(),
    monthlyContribution: request.monthlyInvestmentAmount,
    carriedCash: round2(carriedCash),
    availableDividends: round2(availableDividends),
    availableCash,
    currentPortfolioValue,
    projectedPortfolioValue,
    estimatedFeeRate,
    orders,
    grossOrderValue,
    estimatedFees,
    estimatedTotal,
    remainingCash,
    dataConfidence,
    warnings,
  };
}
