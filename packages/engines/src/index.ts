/**
 * @psx/engines — portfolio intelligence engines.
 * Phase 2: scoring → ranking → portfolio generation.
 * SIP, dividends, wealth projection, health score, rebalancing follow.
 */

export const ENGINES_VERSION = '0.5.0';

export { scoreUniverse, dividendCagr, type ScoreOptions } from './scoring.js';
export { selectHoldings, type SelectionOptions } from './ranking.js';
export { generatePortfolio } from './portfolio.js';
export { filterUniverse } from './filters.js';
export { simulateSip, planFromPortfolio, type SipOptions } from './sip.js';
export { forecastDividends, dividendPlanFromPortfolio, type DividendOptions } from './dividend.js';
export { projectWealth, annualizedIrr, SCENARIO_FACTORS, type WealthOptions } from './wealth.js';
