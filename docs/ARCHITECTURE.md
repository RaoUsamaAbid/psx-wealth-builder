# Architecture

```
Frontend (apps/web)
   ↓ HTTP
Express API (apps/api)
   ↓
Portfolio Engine (packages/engines)
   ↓
Market Data Layer (packages/market-data)  ← provider abstraction
   ↓
Data Providers (Mock | CapitalStake | RealtimePsx)
   ↓
MongoDB Atlas
```

## Monorepo layout

```
apps/
  web/    React + Vite + TS + Tailwind + React Query + Zustand + Recharts
  api/    Node + Express + TS + MongoDB driver
packages/
  shared/        domain types shared everywhere (@psx/shared)
  engines/       portfolio intelligence engines (@psx/engines)
  market-data/   provider abstraction + providers (@psx/market-data)
docs/
```

## Hard rules

- Business logic never calls a third-party API directly. All market data flows
  through `MarketDataProvider` in `@psx/market-data`.
- Secrets live in `.env` (gitignored). Use `.env.example` as the template.
- Third-party market data is sourced via **scraping** (no paid API keys):
  CapitalStake / RealtimePsx providers land in Phase 9.

## Data flow (target)

User inputs (monthly amount, duration, strategy, risk)
→ engines score & rank companies (from DB via repositories)
→ portfolio generator returns allocations + suggested purchases
→ SIP / dividend / wealth-projection engines forecast outcomes.

## Phases

See [`../phase.md`](../phase.md). Phase 0 (this commit) delivers the foundation:
monorepo, TS, ESLint, Prettier, Husky, Commitlint, Docker, Compose, env
handling, and GitHub Actions CI.
