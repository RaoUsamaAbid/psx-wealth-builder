# Documentation

Start here, then dive into the area you need.

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — what the system is, the monorepo,
  request/data flow, the engines, the DB model, production posture, testing.
- **[SCRAPING.md](SCRAPING.md)** — how live PSX data is fetched and parsed, the
  exact DOM mappings, and a **runbook for fixing the scraper when PSX changes
  their site**. Read this first if market data looks wrong.
- **[DEPLOY.md](DEPLOY.md)** — deploying to Render/Railway, env vars, CI-gated
  deploys, backups.

Phase-by-phase build plan: [`../phase.md`](../phase.md).
API endpoints & getting-started: [`../README.md`](../README.md).
