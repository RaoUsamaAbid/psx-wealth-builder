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

## Railway

Railway auto-detects the Dockerfiles. Create two services from this repo
(root `apps/api/Dockerfile` and `apps/web/Dockerfile`), set the same env vars as
above (`PORT` is injected automatically), and point `API_UPSTREAM` /
`CORS_ORIGIN` at the deployed URLs.

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
