import { Router } from 'express';
import { generatePortfolio } from '@psx/engines';
import { loadUniverse, type Repositories } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';
import { parsePortfolioRequest } from './parse.js';

type ReposResolver = () => Promise<Repositories>;

export function portfolioRouter(getRepos: ReposResolver): Router {
  const router = Router();

  // POST /portfolio — generate an investment portfolio from user inputs.
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
      res.json(portfolio);
    })
  );

  return router;
}
