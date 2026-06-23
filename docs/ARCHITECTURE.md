# Architecture

PSX Wealth Builder is a **portfolio intelligence + wealth-planning** platform for
long-term, Shariah-compliant investing on the Pakistan Stock Exchange. Not a
brokerage, not day-trading. It turns a fixed monthly amount into a planned
KMI-30 / Shariah portfolio with SIP, dividend, projection and rebalancing
analytics.

> Companion docs: [SCRAPING.md](SCRAPING.md) (how live data is fetched & how to
> fix it), [DEPLOY.md](DEPLOY.md) (Render/Railway deployment).

## Monorepo (npm workspaces)

```
apps/
  api/    Express + TypeScript HTTP API (the only place that touches Mongo + scrapers)
  web/    React + Vite + Tailwind SPA (dark fintech UI)
packages/
  shared/        domain types shared everywhere (@psx/shared)  — no deps
  engines/       pure portfolio math (@psx/engines)            — depends on shared
  market-data/   PSX scrapers + provider interface + seed (@psx/market-data)
docs/
```

Dependency direction is one-way: `web → shared`, `api → shared + engines +
market-data`, `engines → shared`, `market-data → shared`. The engines are
**pure functions** (no IO) — trivially testable and deterministic.

## Request flow

```
React SPA ──/api──▶ Express
                     │  routes validate input, load data, call engines
                     ▼
                 @psx/engines (pure)  ── scoring → ranking → portfolio
                     │                    sip · dividend · wealth · health · rebalance
                     ▼
                 Repositories ──▶ MongoDB Atlas (companies, quotes, fundamentals,
                                                 dividends, users, …, meta)
```

The frontend talks to `/api/*` (Vite dev proxy locally, nginx proxy in prod).
Auth is JWT (`Authorization: Bearer`); `/me/*` routes are per-user.

## Data model (MongoDB)

| Collection                                                      | Shape                                                      | Source                     |
| --------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| `companies`                                                     | symbol, name, sector, marketCap, shariahCompliant, indices | scrape (sync)              |
| `quotes`                                                        | symbol, price, change, changePercent, asOf                 | scrape (sync)              |
| `fundamentals`                                                  | symbol, eps, peRatio, growth, yield, beta, debt, …         | scrape (deep) + estimates  |
| `dividends`                                                     | symbol, year, amountPerShare, payoutRatio                  | estimates (price-anchored) |
| `users` / `savedPortfolios` / `watchlist` / `investmentHistory` | per-user account data                                      | app                        |
| `meta`                                                          | key/value (e.g. last sync status)                          | app                        |

The **DB is the source of truth**. Market data is pulled on demand
(scrape-on-sync) and persisted — never polled. See [SCRAPING.md](SCRAPING.md).

## The engines (`@psx/engines`)

| Module      | Does                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `scoring`   | min-max-normalized 0–100 score per company for a strategy + risk                                      |
| `ranking`   | greedy top-N with a per-sector diversification cap + backfill                                         |
| `portfolio` | filter universe → score → select → score-proportional whole-share allocation                          |
| `sip`       | monthly accumulation, carried leftover cash, average-cost tracking                                    |
| `dividend`  | annual dividends as a **constant yield on the evolving price**, reinvest ON/OFF                       |
| `wealth`    | conservative/base/optimistic scenarios (additive return band), money-weighted CAGR (IRR), goal solver |
| `health`    | 0–100 score from diversification / risk / dividend / growth / sector exposure                         |
| `rebalance` | current holdings vs ideal → hold / increase / reduce / replace                                        |
| `filters`   | index / Shariah / financial-threshold gates applied before scoring                                    |

Two modelling rules worth knowing (both learned from real data — see the
`fix: monotonic wealth scenarios` commit):

- The long-term **price-return** assumption is floored at 0 (no perpetual
  decline), and scenarios shift it by an **additive** band so
  conservative ≤ base ≤ optimistic for any sign.
- Dividends are a **constant yield on price** so reinvestment compounds at a
  stable rate (a fixed-DPS model caused runaway share accumulation).

## Market data provider abstraction

All quote access goes through `MarketDataProvider`
([`packages/market-data/src/provider.ts`](../packages/market-data/src/provider.ts)).
The API uses a **DB-backed** implementation (`DbQuoteProvider`) feeding a small
in-memory cache that the socket.io board reads. If PSX ever ships a real API,
implement one new provider — nothing else changes.

## Production posture

pino structured logging · rate limiting (global + stricter auth/sync) · helmet +
trust-proxy · fail-fast config validation · graceful shutdown · two Docker
services (API + nginx web) · CI runs every test suite and gates deploys. Details
in [DEPLOY.md](DEPLOY.md).

## Testing

Vitest workspace across four projects — `engines` + `market-data` (unit, incl.
fixture-pinned scraper accuracy + stress), `api` (supertest integration over an
in-memory MongoDB, no Atlas needed), `web` (RTL component/store/util). `npm test`
runs them all; CI runs them on every push.
