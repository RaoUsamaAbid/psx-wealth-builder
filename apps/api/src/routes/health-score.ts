import { Router } from 'express';
import { generatePortfolio, scorePortfolioHealth } from '@psx/engines';
import { loadUniverse, type Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';
import { parsePortfolioRequest } from './parse.js';

type ReposResolver = () => Promise<Repositories>;

export function healthScoreRouter(getRepos: ReposResolver): Router {
  const router = Router();

  // POST /portfolio-health — generate a portfolio and score its quality 0..100.
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { request, error } = parsePortfolioRequest(req.body);
      if (!request) {
        res.status(400).json({ error });
        return;
      }
      const repos = await getRepos();
      const universe = await loadUniverse(repos);
      const portfolio = generatePortfolio(universe, request);
      const health = scorePortfolioHealth(portfolio, universe);
      res.json({ request, portfolio, health });
    })
  );

  return router;
}
