import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SEED_COMPANIES, SEED_QUOTES, SEED_FUNDAMENTALS, SEED_DIVIDENDS } from '@psx/market-data';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  resolve(here, '../../../packages/market-data/src/scraping/__fixtures__/psx-market-watch.html'),
  'utf-8'
);

let mongo: MongoMemoryServer;
let app: Express;
/* eslint-disable @typescript-eslint/no-explicit-any */
let repos: any;
let runMarketSync: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'psx_sync_test';
  process.env.JWT_SECRET = 'sync-test-secret';

  const { createApp } = await import('../dist/app.js');
  ({ runMarketSync } = await import('../dist/market/sync.js'));
  const ctx = createApp();
  app = ctx.app;
  repos = await ctx.getRepos();
  // Start from the curated seed so we can prove pruning replaces it.
  await repos.companies.upsertMany(SEED_COMPANIES);
  await repos.quotes.upsertMany(SEED_QUOTES);
  await repos.fundamentals.upsertMany(SEED_FUNDAMENTALS);
  await repos.dividends.upsertMany(SEED_DIVIDENDS);
}, 120000);

afterAll(async () => {
  const { closeDb } = await import('../dist/db.js');
  await closeDb();
  await mongo?.stop();
});

describe('market sync', () => {
  it('replaces the universe with the live Shariah set and prunes stale names', async () => {
    expect(await repos.companies.count()).toBe(SEED_COMPANIES.length);

    const status = await runMarketSync(repos, async () => fixture);
    expect(status.companies).toBe(4); // OGDC, MEBL, LUCK, FFC (WTL excluded)
    expect(status.source).toBe('psx-market-watch');

    const symbols = (await repos.companies.findAll()).map((c: { symbol: string }) => c.symbol);
    expect(symbols).toContain('OGDC');
    expect(symbols).not.toContain('WTL'); // non-Shariah never added
    expect(symbols).not.toContain('ENGRO'); // seed-only name pruned away
    expect(await repos.companies.count()).toBe(4);
  });

  it('persists prices from the scrape (engine input is now real)', async () => {
    const ogdc = await repos.quotes.findBySymbol('OGDC');
    expect(ogdc.price).toBeCloseTo(334.25, 2);
  });

  it('GET /market/sync/status reports the last sync', async () => {
    const res = await request(app).get('/market/sync/status');
    expect(res.status).toBe(200);
    expect(res.body.sync.companies).toBe(4);
  });

  it('POST /market/sync requires authentication', async () => {
    const res = await request(app).post('/market/sync');
    expect(res.status).toBe(401);
  });
});
