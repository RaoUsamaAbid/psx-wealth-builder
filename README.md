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

# 4. run dev (api + web)
npm run dev
# api  → http://localhost:4000  (GET /health)
# web  → http://localhost:5173
```

## Scripts

| Command                               | Description                 |
| ------------------------------------- | --------------------------- |
| `npm run dev`                         | api + web in watch mode     |
| `npm run dev:api` / `npm run dev:web` | run one app                 |
| `npm run build`                       | build packages then apps    |
| `npm run lint`                        | ESLint across the repo      |
| `npm run format`                      | Prettier write              |
| `npm run typecheck`                   | TS typecheck all workspaces |

## Docker

```bash
docker compose --profile full up --build   # redis + api + web
```

## Roadmap

Phases 0–11 are tracked in [`phase.md`](phase.md). Each phase is one commit on
`main`.

## License

Private / unlicensed (pre-release).
