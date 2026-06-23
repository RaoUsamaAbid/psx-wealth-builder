# Deployment

Production runs two Docker services — **API** (Node/Express) and **web**
(nginx serving the built SPA and proxying `/api` + `/socket.io` to the API).
MongoDB is **Atlas** (managed). No Redis (no background queue is used).

## Render (blueprint)

1. Push the repo to GitHub.
2. In Render: **New → Blueprint**, point at this repo. It reads
   [`render.yaml`](../render.yaml) and creates `psx-api` + `psx-web`.
3. Set the dashboard-managed env vars (marked `sync: false`):

   | Service | Var            | Value                                            |
   | ------- | -------------- | ------------------------------------------------ |
   | psx-api | `MONGODB_URI`  | your Atlas connection string                     |
   | psx-api | `CORS_ORIGIN`  | the web URL, e.g. `https://psx-web.onrender.com` |
   | psx-web | `API_UPSTREAM` | the API URL, e.g. `https://psx-api.onrender.com` |

   `JWT_SECRET` is auto-generated; `NODE_ENV=production` is set. The API
   **fails fast** at boot if `MONGODB_URI` is missing or `JWT_SECRET` is weak.

4. Health check: the API exposes `GET /health` (configured as the health path).

### CI-gated deploys

`autoDeploy` is **off** in the blueprint so deploys only happen after CI is
green. The [CI workflow](../.github/workflows/ci.yml) runs format + lint +
typecheck + build + **all test suites** (unit, integration, stress), then — only
on `main`, only if everything passed — calls the Render **deploy hooks**.

Add two GitHub repo secrets (Render → service → Settings → Deploy Hook):

- `RENDER_DEPLOY_HOOK_API`
- `RENDER_DEPLOY_HOOK_WEB`

If the secrets are absent the deploy step is skipped (CI still gates merges).

## Free tier (no card) — two manual Render Web Services

The **Blueprint wizard requires a card**; creating **free Web Services manually
does not**. `render.yaml` uses `plan: free` for reference, but deploy by hand:

1. Atlas → **Network Access** → allow `0.0.0.0/0` (free hosts have no static IP).
2. Render → **New → Web Service** → connect the repo →
   - **psx-api:** Runtime **Docker**, Dockerfile `apps/api/Dockerfile`, root `/`,
     **Instance type: Free**, health check `/health`. Env: `NODE_ENV=production`,
     `MONGODB_URI`, `MONGODB_DB=psx_wealth_builder`, `JWT_SECRET` (32+ chars),
     `JWT_EXPIRES_IN=7d`. Create → note its URL.
   - **psx-web:** Runtime **Docker**, Dockerfile `apps/web/Dockerfile`, **Free**.
     Env: `API_UPSTREAM=<api URL>`. Create → note its URL.
3. Set `CORS_ORIGIN=<web URL>` on **psx-api** → redeploy both.

Free instances **sleep after ~15 min idle** (first hit after wake is slow, ~50s)
— fine for an MVP. A deep sync (~75s) finishes well within the idle window, and
the Market page polls during it (keeps the API awake).

Free alternative for the frontend (zero cold-start, no card): host the SPA on
**Cloudflare Pages / Netlify / Vercel** and add a rewrite proxying `/api/*` and
`/socket.io/*` to the API URL (so the browser stays same-origin). The API still
needs a server host (Render free works).

## Railway

Railway no longer offers a no-card free tier (trial/Hobby needs a card). If you
use it: auto-detects the Dockerfiles — create two services from this repo
(`apps/api/Dockerfile`, `apps/web/Dockerfile`), set the same env vars
(`PORT` is injected), and point `API_UPSTREAM` / `CORS_ORIGIN` at the URLs.

## First run

After deploy, sign in and click **Sync market data** (Market page) to populate
the live KMI-30 / Shariah universe + prices, then **Deep sync** for real
fundamentals. The DB is the source of truth from then on.

## Backups

- **Atlas** takes managed snapshots (enable in the Atlas dashboard).
- Ad-hoc archive: `MONGODB_URI=... ./scripts/backup.sh` (mongodump, gzipped).

## Local full-stack

```bash
docker compose --profile full up --build   # api :4000 + web :5173
```
