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
- **API:** Node.js, Express, TypeScript
- **DB:** MongoDB Atlas
- **Realtime/Jobs:** Socket.io, BullMQ + Redis
- **Infra:** Docker, GitHub Actions

## Monorepo

```
apps/web      frontend
apps/api      Express API
packages/shared        shared domain types
packages/engines       portfolio engines
packages/market-data   market-data provider abstraction
docs/
```

## Getting started

```bash
# 1. install (npm workspaces)
npm install

# 2. configure env
cp .env.example .env        # fill in MongoDB Atlas URI, etc.

# 3. start Redis (for jobs)
docker compose up -d redis

# 4. seed the database (companies, quotes, fundamentals, dividends)
npm run seed

# 5. run dev (api + web)
npm run dev
# api  → http://localhost:4000  (GET /health)
# web  → http://localhost:5173
```

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
}
```

Returns scored holdings with allocation %, whole-share purchase plan, amount
invested this month, and leftover cash.

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

## Docker

```bash
docker compose --profile full up --build   # redis + api + web
```

## Roadmap

Phases 0–11 are tracked in [`phase.md`](phase.md). Each phase is one commit on
`main`.

## License

Private / unlicensed (pre-release).
