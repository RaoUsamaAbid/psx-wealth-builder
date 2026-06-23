# PSX Wealth Builder

Long-term wealth creation platform for **Pakistan Stock Exchange** investors who
invest a fixed amount every month into Shariah-compliant Pakistani stocks
(KMI-30, KMI-100).

> Not a day-trading platform. Not a brokerage. A portfolio intelligence and
> wealth-planning platform.

It answers questions like:

- "I have PKR 50,000/month — what should I invest in today?"
- "I want PKR 20M in 15 years — what monthly investment is required?"
- "I want PKR 200,000/month in dividends after retirement."

## Tech stack

- **Web:** React, TypeScript, Vite, TailwindCSS, React Query, Zustand, Recharts
- **API:** Node.js, Express, TypeScript, pino logging
- **DB:** MongoDB Atlas
- **Realtime:** Socket.io
- **Infra:** Docker, GitHub Actions CI, Vitest, deploys to Render/Railway

## Monorepo

```
apps/web      frontend
apps/api      Express API
packages/shared        shared domain types
packages/engines       portfolio engines
packages/market-data   PSX scrapers + provider + seed
docs/
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data flow, engines, DB model
- [docs/SCRAPING.md](docs/SCRAPING.md) — **how PSX scraping works + runbook to fix it if PSX changes their site**
- [docs/DEPLOY.md](docs/DEPLOY.md) — Render/Railway deployment, env, CI-gated deploys, backups

## Frontend

A full React MVP (dark fintech UI) drives every endpoint. Login-required;
JWT persisted client-side. Stack: React + Vite + TS, TailwindCSS, React Query,
Zustand, Recharts, socket.io-client, react-router.

- **Planner** — inputs → tabs: Allocation (donut + holdings), Health (radar +
  score ring), SIP (growth area chart), Dividends (reinvest toggle), Projection
  (3 scenarios + goal solver), and Buy plan (exact whole-share monthly orders
  based on logged holdings, carried cash, dividends and estimated trading costs).
  Save plans to your account.
- **My SIPs** — persistent recurring plans with their own strategy, transaction
  ledger, carried cash and monthly schedule. Generate an exact buy plan, confirm
  the purchases, then reload next month with holdings and cash already applied.
- **Companies** — searchable/filterable table + detail drawer (fundamentals,
  dividend history, quote).
- **Market** — live quote board + ticker over socket.io with freshness status.
- **Rebalance** — enter holdings → hold/increase/reduce/replace actions.
- **Account** — saved plans, watchlist, investment history.

```bash
npm run dev    # api :4000 + web :5173
```

## Getting started

```bash
# 1. install (npm workspaces)
npm install

# 2. configure env
cp .env.example .env        # fill in MongoDB Atlas URI + JWT_SECRET

# 3. seed a starter universe (or skip and use the in-app "Sync market data")
npm run seed

# 4. run dev (api + web)
npm run dev
# api  → http://localhost:4000  (GET /health)
# web  → http://localhost:5173
```

Then sign in and hit **Sync market data** (Market page) to pull the live
KMI universe + prices, and **Deep sync** for real fundamentals.

## API endpoints

| Method | Path                                                    | Description                                       |
| ------ | ------------------------------------------------------- | ------------------------------------------------- |
| GET    | `/health`                                               | service + DB status                               |
| GET    | `/companies?index=KMI30&sector=Cement&shariahOnly=true` | filtered company list (market-cap sorted)         |
| GET    | `/companies/:symbol`                                    | company + fundamentals + dividend history + quote |
| POST   | `/portfolio`                                            | generate a portfolio from inputs (see below)      |
| POST   | `/sip`                                                  | simulate monthly investing over time              |
| POST   | `/dividends`                                            | forecast dividend income (reinvest ON vs OFF)     |
| POST   | `/projection`                                           | wealth projection: 3 scenarios + CAGR + target    |
| POST   | `/portfolio-health`                                     | portfolio + 0–100 health score with breakdown     |
| POST   | `/rebalance`                                            | hold/increase/reduce/replace actions vs target    |
| POST   | `/recommendations/monthly`                              | authenticated exact-share monthly model buy plan  |
| GET    | `/market/status`                                        | provider, status, last-updated                    |
| GET    | `/market/quotes` · `/market/quotes/:symbol`             | last-synced quotes                                |
| POST   | `/market/sync`                                          | scrape PSX → refresh DB universe (auth)           |
| GET    | `/market/sync/status`                                   | last sync time + counts                           |
| POST   | `/auth/register` · `/auth/login`                        | create account / log in → JWT                     |
| GET    | `/auth/me`                                              | current user (Bearer token)                       |
| —      | `/me/portfolios` · `/me/watchlist` · `/me/history`      | saved data (auth required, CRUD)                  |
| —      | `/me/sips` · `/me/sips/:id/recommendation`              | persistent SIPs and monthly recommendations       |
| POST   | `/me/sips/:id/confirm`                                  | save recommended buys and roll cash forward       |

`POST /portfolio` body:

```jsonc
{
  "monthlyInvestmentAmount": 50000, // PKR/month (required, > 0)
  "durationYears": 15, // required, > 0 (used by projections in Phase 5)
  "strategy": "dividend", // dividend | growth | balanced
  "riskLevel": "low", // low | medium | high
  "index": "KMI30", // optional: KMI30 | KMI100 (default all)
  "holdingsCount": 10, // optional: 1–30 (default 10)
  "maxPerSector": 2, // optional: 1–10 sector cap (default 2)
  "filters": {
    // optional advanced filters
    "shariahOnly": true, // keep only Shariah-compliant names
    "minDividendYield": 0.05, // fraction
    "minEpsGrowth": 0.1, // fraction
    "minRevenueGrowth": 0.1, // fraction
    "maxDebtRatio": 0.4, // fraction
    "maxVolatility": 1.0, // max beta
  },
}
```

Returns scored holdings with allocation %, whole-share purchase plan, amount
invested this month, and leftover cash. Filters narrow the universe before
scoring, so `/sip`, `/dividends`, and `/projection` honor them too.

`POST /sip` takes the same body, plus optional `months` (default
`durationYears * 12`), `expectedAnnualReturn` (flat override; default = each
holding's EPS growth), and `includeTimeline` (default `true`). It simulates
monthly contributions — whole-share accumulation with carried leftover cash —
and returns per-position shares/average-cost/market-value plus a month-by-month
timeline and total gain.

`POST /dividends` takes the same body, plus optional `years` (default
`round(durationYears)`, 1–50). It forecasts annual dividend income while
contributing monthly, under both scenarios — **reinvest OFF** (dividends paid
out as cash) and **reinvest ON** (DRIP: dividends buy more shares) — returning a
per-year series, cumulative dividends, final shares/value, and the final
monthly dividend run-rate (answers "how much passive income after N years?").

`POST /projection` takes the same body, plus optional `years` (1–50),
`reinvest` (default `true`), and `targetValue`. It projects long-term wealth
under **conservative / base / optimistic** scenarios (each scaling expected
returns), reporting total invested, future value, total dividends, total
return, money-weighted CAGR (IRR), final shares, and the dividend run-rate per
scenario. When `targetValue` is given it also solves the approximate monthly
contribution required to reach that value (answers "what monthly to hit PKR X
in N years?").

`POST /portfolio-health` takes the same body and returns the generated
portfolio plus a 0–100 **health score** (grade A–E) built from five components —
diversification, risk, dividend strength, growth potential, sector exposure —
along with the underlying metrics (effective holdings, sector concentration,
portfolio beta/debt/yield) and human-readable notes.

`POST /rebalance` takes the same body, plus `currentHoldings: [{ symbol, shares
}]` (required) and optional `band` (tolerance in percentage points, default 5).
It compares the current holdings to the ideal target and returns per-position
actions — **hold / increase / reduce / replace** — detecting overweight
positions, sector concentration, dividend deterioration, and better
opportunities (high-scoring names not yet held), each with reasons and a
suggested replacement where relevant.

`POST /recommendations/monthly` is authenticated and takes the portfolio request
plus optional `carriedCash`, `availableDividends`, `estimatedFeeRate` (fraction),
and `maxOrders` (1–10). It derives current shares from the user's investment
history, values them using the latest synced quotes, calculates each target
position's value deficit, and returns exact whole-share orders without
overspending. The response includes estimated costs, remaining cash, confidence,
expiry, reasons and data-quality warnings. It is a model buy plan, not trade
execution or a return guarantee.

### Market data: scrape-on-sync

The app does **not** poll a live feed. PSX has no free real-time API, so market
data is pulled **on demand** from the official PSX data portal
(`dps.psx.com.pk/market-watch`) and **persisted** — the DB is the source of truth
for all calculations.

**`POST /market/sync`** (any signed-in user) scrapes the market-watch page once
(~5s) and refreshes the DB:

- **Companies** — the live **KMI-30** constituents (exactly 30) and the **KMI
  All-Share** Shariah universe (~290+), with real names, sectors and index
  membership. Shariah-compliance is derived from KMI membership (KMI = the
  Shariah-screened index). Non-Shariah names are pruned.
- **Quotes** — real current prices/change, read from each row's machine-readable
  `data-order` attribute (mapped by header `data-name`, so a column re-order or
  icon/`%` in the text can't corrupt values).
- **Fundamentals/dividends** — the market-watch page carries none, so the quick
  sync seeds them from the **real price** (an estimate).

**Deep sync** (`POST /market/sync/deep`, background) then scrapes each company
page to **upsert real fundamentals** — sector name, market cap, P/E, EPS, EPS
growth and revenue growth — in place, never pruning. Progress is reported via
`GET /market/sync/status` and a progress bar on the Market page.

The Market page shows **"Sync market data"** + **"Deep sync"** buttons; the live
board reads quotes from the DB (pushed over socket.io). Everything is resilient:
a fetch/parse failure aborts without touching existing data, and captured-page
fixture tests fail CI loudly if PSX changes its DOM. Endpoints are rate-limited
(stricter on auth + sync).

### Accounts & auth

JWT auth (`Authorization: Bearer <token>`), passwords hashed with bcrypt. Set
`JWT_SECRET` (and optionally `JWT_EXPIRES_IN`, default `7d`) in `.env`.

- `POST /auth/register` / `POST /auth/login` → `{ token, user }`
- `GET /auth/me` → current user
- `GET/POST /me/portfolios`, `GET/DELETE /me/portfolios/:id` — save named portfolio requests
- `GET/POST /me/watchlist`, `DELETE /me/watchlist/:symbol` — track symbols
- `GET/POST /me/history`, `DELETE /me/history/:id` — investment history

All `/me/*` routes require a valid token; data is scoped per user.

## Scripts

| Command                               | Description                        |
| ------------------------------------- | ---------------------------------- |
| `npm run dev`                         | api + web in watch mode            |
| `npm run dev:api` / `npm run dev:web` | run one app                        |
| `npm run seed`                        | load seed market data into MongoDB |
| `npm run build`                       | build packages then apps           |
| `npm run lint`                        | ESLint across the repo             |
| `npm run format`                      | Prettier write                     |
| `npm run typecheck`                   | TS typecheck all workspaces        |
| `npm test`                            | unit + integration + stress tests  |

## Production & deployment

Structured logging (pino), rate limiting (global + stricter auth/sync),
helmet + trust-proxy, fail-fast config validation, and graceful shutdown.
Deploys as two Docker services (API + nginx web) to **Render/Railway** with
MongoDB Atlas — see [`docs/DEPLOY.md`](docs/DEPLOY.md). CI runs every test suite
and only triggers a deploy when green.

```bash
docker compose --profile full up --build   # local full stack: api + web
```

## Roadmap

Phases 0–11 are tracked in [`phase.md`](phase.md). Each phase is one commit on
`main`.

## License

Private / unlicensed (pre-release).
