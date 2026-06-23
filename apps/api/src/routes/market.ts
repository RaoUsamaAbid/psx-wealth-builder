import { Router } from 'express';
import type { QuoteService } from '../market/quote-service.js';

export function marketRouter(quotes: QuoteService): Router {
  const router = Router();

  // GET /market/status — source, realtime status, last updated, freshness.
  router.get('/status', (_req, res) => {
    res.json(quotes.snapshot());
  });

  // GET /market/quotes — cached quotes + status header fields.
  router.get('/quotes', (_req, res) => {
    res.json({ ...quotes.snapshot(), quotes: quotes.quotesList() });
  });

  // GET /market/quotes/:symbol — single cached quote.
  router.get('/quotes/:symbol', (req, res) => {
    const quote = quotes.getQuote(req.params.symbol ?? '');
    if (!quote) {
      res.status(404).json({ error: `no cached quote for ${req.params.symbol}` });
      return;
    }
    res.json({ ...quotes.snapshot(), quote });
  });

  return router;
}
