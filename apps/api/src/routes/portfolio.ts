import { Router } from 'express';
import type { Index, PortfolioRequest, RiskLevel, Strategy } from '@psx/shared';
import { generatePortfolio } from '@psx/engines';
import { loadUniverse, type Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';

type ReposResolver = () => Promise<Repositories>;

const STRATEGIES: Strategy[] = ['dividend', 'growth', 'balanced'];
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];
const INDEXES: Index[] = ['KMI30', 'KMI100'];

interface ParseResult {
  request?: PortfolioRequest;
  error?: string;
}

function parseRequest(body: unknown): ParseResult {
  if (typeof body !== 'object' || body === null) return { error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;

  const amount = Number(b.monthlyInvestmentAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'monthlyInvestmentAmount must be a positive number' };
  }
  const durationYears = Number(b.durationYears);
  if (!Number.isFinite(durationYears) || durationYears <= 0) {
    return { error: 'durationYears must be a positive number' };
  }
  if (!STRATEGIES.includes(b.strategy as Strategy)) {
    return { error: `strategy must be one of ${STRATEGIES.join(', ')}` };
  }
  if (!RISK_LEVELS.includes(b.riskLevel as RiskLevel)) {
    return { error: `riskLevel must be one of ${RISK_LEVELS.join(', ')}` };
  }
  if (b.index !== undefined && !INDEXES.includes(b.index as Index)) {
    return { error: `index must be one of ${INDEXES.join(', ')}` };
  }

  const request: PortfolioRequest = {
    monthlyInvestmentAmount: amount,
    durationYears,
    strategy: b.strategy as Strategy,
    riskLevel: b.riskLevel as RiskLevel,
  };
  if (b.index !== undefined) request.index = b.index as Index;
  if (b.holdingsCount !== undefined) {
    const n = Number(b.holdingsCount);
    if (!Number.isInteger(n) || n < 1 || n > 30) {
      return { error: 'holdingsCount must be an integer between 1 and 30' };
    }
    request.holdingsCount = n;
  }
  if (b.maxPerSector !== undefined) {
    const n = Number(b.maxPerSector);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return { error: 'maxPerSector must be an integer between 1 and 10' };
    }
    request.maxPerSector = n;
  }
  return { request };
}

export function portfolioRouter(getRepos: ReposResolver): Router {
  const router = Router();

  // POST /portfolio — generate an investment portfolio from user inputs.
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { request, error } = parseRequest(req.body);
      if (!request) {
        res.status(400).json({ error });
        return;
      }
      const repos = await getRepos();
      const universe = await loadUniverse(repos);
      const portfolio = generatePortfolio(universe, request);
      res.json(portfolio);
    })
  );

  return router;
}
