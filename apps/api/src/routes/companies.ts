import { Router } from 'express';
import type { Index } from '@psx/shared';
import type { Repositories, CompanyFilter } from '../repositories.js';
import { asyncHandler } from '../async-handler.js';

type ReposResolver = () => Promise<Repositories>;

export function companiesRouter(getRepos: ReposResolver): Router {
  const router = Router();

  // GET /companies?index=KMI30&sector=Cement&shariahOnly=true
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const filter: CompanyFilter = {};
      const index = req.query.index;
      if (index === 'KMI30' || index === 'KMI100') filter.index = index as Index;
      if (typeof req.query.sector === 'string') filter.sector = req.query.sector;
      if (req.query.shariahOnly === 'true') filter.shariahOnly = true;

      const repos = await getRepos();
      const companies = await repos.companies.findAll(filter);
      res.json({ count: companies.length, companies });
    })
  );

  // GET /companies/:symbol — company + fundamentals + dividend history + quote
  router.get(
    '/:symbol',
    asyncHandler(async (req, res) => {
      const symbol = (req.params.symbol ?? '').toUpperCase();
      const repos = await getRepos();
      const company = await repos.companies.findBySymbol(symbol);
      if (!company) {
        res.status(404).json({ error: `company not found: ${symbol}` });
        return;
      }
      const [fundamentals, dividends, quote] = await Promise.all([
        repos.fundamentals.findBySymbol(symbol),
        repos.dividends.findBySymbol(symbol),
        repos.quotes.findBySymbol(symbol),
      ]);
      res.json({ company, fundamentals, dividends, quote });
    })
  );

  return router;
}
