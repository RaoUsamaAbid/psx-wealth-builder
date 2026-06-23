import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SEED_COMPANIES, SEED_QUOTES, SEED_FUNDAMENTALS, SEED_DIVIDENDS } from '@psx/market-data';

let mongo: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'psx_test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.MARKET_DATA_PROVIDER = 'mock';

  const { createApp } = await import('../dist/app.js');
  const ctx = createApp();
  app = ctx.app;
  const repos = await ctx.getRepos();
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

const validBody = {
  monthlyInvestmentAmount: 50000,
  durationYears: 15,
  strategy: 'dividend',
  riskLevel: 'low',
};

describe('health & companies', () => {
  it('GET /health reports DB connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('connected');
  });

  it('GET /companies returns the seeded universe', async () => {
    const res = await request(app).get('/companies');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(SEED_COMPANIES.length);
  });

  it('GET /companies?index=KMI30 returns exactly 30', async () => {
    const res = await request(app).get('/companies?index=KMI30');
    expect(res.body.count).toBe(30);
  });

  it('GET /companies/:symbol joins fundamentals + dividends + quote', async () => {
    const res = await request(app).get('/companies/OGDC');
    expect(res.status).toBe(200);
    expect(res.body.company.symbol).toBe('OGDC');
    expect(res.body.fundamentals).toBeTruthy();
    expect(res.body.dividends.length).toBeGreaterThan(0);
    expect(res.body.quote).toBeTruthy();
  });

  it('GET /companies/NOPE → 404', async () => {
    const res = await request(app).get('/companies/NOPE');
    expect(res.status).toBe(404);
  });
});

describe('engine endpoints', () => {
  it('POST /portfolio generates allocations summing to ~100', async () => {
    const res = await request(app).post('/portfolio').send(validBody);
    expect(res.status).toBe(200);
    const sum = res.body.holdings.reduce(
      (s: number, h: { allocationPercent: number }) => s + h.allocationPercent,
      0
    );
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });

  it('POST /portfolio rejects invalid input with 400', async () => {
    const res = await request(app)
      .post('/portfolio')
      .send({ ...validBody, monthlyInvestmentAmount: -1 });
    expect(res.status).toBe(400);
  });

  it('POST /sip returns the right contribution total', async () => {
    const res = await request(app).post('/sip').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.totalContributed).toBe(50000 * 15 * 12);
    expect(res.body.timeline).toHaveLength(180);
  });

  it('POST /dividends returns both reinvest scenarios', async () => {
    const res = await request(app).post('/dividends').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.reinvestOn.finalShares).toBeGreaterThan(res.body.reinvestOff.finalShares);
  });

  it('POST /projection returns 3 scenarios and solves a target', async () => {
    const res = await request(app)
      .post('/projection')
      .send({ ...validBody, targetValue: 20_000_000 });
    expect(res.status).toBe(200);
    expect(res.body.scenarios).toHaveLength(3);
    expect(res.body.targetSolve.requiredMonthlyInvestment).toBeGreaterThan(0);
  });

  it('POST /portfolio-health returns a graded score', async () => {
    const res = await request(app).post('/portfolio-health').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.health.score).toBeGreaterThan(0);
    expect(['A', 'B', 'C', 'D', 'E']).toContain(res.body.health.grade);
  });

  it('POST /rebalance returns actions and a summary', async () => {
    const res = await request(app)
      .post('/rebalance')
      .send({
        ...validBody,
        currentHoldings: [
          { symbol: 'OGDC', shares: 300 },
          { symbol: 'LUCK', shares: 200 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.actions.length).toBeGreaterThan(0);
  });
});

describe('market', () => {
  it('GET /market/status reports the DB-backed provider', async () => {
    const res = await request(app).get('/market/status');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('synced');
  });
});

describe('auth & account', () => {
  const email = 'tester@psx.test';
  let token = '';

  it('registers and returns a token', async () => {
    const res = await request(app).post('/auth/register').send({ email, password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
  });

  it('rejects duplicate registration with 409', async () => {
    const res = await request(app).post('/auth/register').send({ email, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/auth/login').send({ email, password: 'wrongpass1' });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me requires a token', async () => {
    expect((await request(app).get('/auth/me')).status).toBe(401);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it('saves and lists portfolios (scoped to the user)', async () => {
    const save = await request(app)
      .post('/me/portfolios')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plan A', request: validBody });
    expect(save.status).toBe(201);
    const list = await request(app).get('/me/portfolios').set('Authorization', `Bearer ${token}`);
    expect(list.body.portfolios).toHaveLength(1);
  });

  it('manages a watchlist with symbol validation', async () => {
    await request(app)
      .post('/me/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'OGDC' });
    const bad = await request(app)
      .post('/me/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'ZZZZ' });
    expect(bad.status).toBe(404);
    const list = await request(app).get('/me/watchlist').set('Authorization', `Bearer ${token}`);
    expect(list.body.watchlist.map((w: { symbol: string }) => w.symbol)).toContain('OGDC');
  });

  it('logs investment history', async () => {
    const add = await request(app)
      .post('/me/history')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'OGDC', shares: 100, price: 166.59 });
    expect(add.status).toBe(201);
    const list = await request(app).get('/me/history').set('Authorization', `Bearer ${token}`);
    expect(list.body.history).toHaveLength(1);
  });

  it('generates exact monthly buy orders from account history', async () => {
    const res = await request(app)
      .post('/recommendations/monthly')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validBody,
        monthlyInvestmentAmount: 10_000,
        durationYears: 5,
        index: 'KMI30',
        holdingsCount: 5,
        carriedCash: 500,
        availableDividends: 250,
        estimatedFeeRate: 0.0025,
        maxOrders: 3,
      });
    expect(res.status).toBe(200);
    expect(res.body.availableCash).toBe(10_750);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.orders.length).toBeLessThanOrEqual(3);
    expect(res.body.estimatedTotal).toBeLessThanOrEqual(res.body.availableCash);
    expect(res.body.currentPortfolioValue).toBeGreaterThan(0);
  });

  it('creates a persistent SIP, recommends orders, and confirms the cycle', async () => {
    const create = await request(app)
      .post('/me/sips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Five year KMI plan',
        request: {
          ...validBody,
          monthlyInvestmentAmount: 10_000,
          durationYears: 5,
          index: 'KMI30',
          holdingsCount: 5,
        },
        estimatedFeeRate: 0.0025,
        maxOrders: 3,
      });
    expect(create.status).toBe(201);
    const id = create.body.plan.id;

    const recommendation = await request(app)
      .post(`/me/sips/${id}/recommendation`)
      .set('Authorization', `Bearer ${token}`)
      .send({ availableDividends: 500 });
    expect(recommendation.status).toBe(200);
    expect(recommendation.body.availableCash).toBe(10_500);
    expect(recommendation.body.orders.length).toBeGreaterThan(0);

    const confirm = await request(app)
      .post(`/me/sips/${id}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ availableDividends: 500 });
    expect(confirm.status).toBe(201);
    expect(confirm.body.confirmedOrders.length).toBeGreaterThan(0);
    expect(confirm.body.plan.carriedCash).toBeGreaterThanOrEqual(0);
    expect(confirm.body.plan.lastInvestedAt).toBeTruthy();

    const detail = await request(app).get(`/me/sips/${id}`).set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.holdings.length).toBeGreaterThan(0);
    expect(detail.body.transactions.length).toBe(confirm.body.confirmedOrders.length);
  });

  it('allows only one confirmation when the same SIP cycle is submitted concurrently', async () => {
    const create = await request(app)
      .post('/me/sips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Concurrent confirmation plan',
        request: {
          ...validBody,
          monthlyInvestmentAmount: 15_000,
          durationYears: 5,
          index: 'KMI30',
          holdingsCount: 5,
        },
        estimatedFeeRate: 0.0025,
        maxOrders: 4,
      });
    const id = create.body.plan.id;
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post(`/me/sips/${id}/confirm`)
          .set('Authorization', `Bearer ${token}`)
          .send({ availableDividends: 0 })
      )
    );
    expect(attempts.filter((result) => result.status === 201)).toHaveLength(1);
    expect(attempts.filter((result) => result.status === 409)).toHaveLength(9);

    const detail = await request(app).get(`/me/sips/${id}`).set('Authorization', `Bearer ${token}`);
    const winning = attempts.find((result) => result.status === 201)!;
    expect(detail.body.transactions).toHaveLength(winning.body.confirmedOrders.length);
  });

  it('handles concurrent recommendation reads for a persistent SIP', async () => {
    const create = await request(app)
      .post('/me/sips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Recommendation load plan',
        request: {
          ...validBody,
          monthlyInvestmentAmount: 10_000,
          durationYears: 5,
          index: 'KMI30',
          holdingsCount: 5,
        },
      });
    const id = create.body.plan.id;
    const results = await Promise.all(
      Array.from({ length: 40 }, () =>
        request(app)
          .post(`/me/sips/${id}/recommendation`)
          .set('Authorization', `Bearer ${token}`)
          .send({ availableDividends: 250 })
      )
    );
    expect(results.every((result) => result.status === 200)).toBe(true);
    expect(results.every((result) => result.body.estimatedTotal <= 10_250)).toBe(true);
  });

  it('blocks unauthenticated access to /me/*', async () => {
    expect((await request(app).get('/me/portfolios')).status).toBe(401);
    expect((await request(app).get('/me/sips')).status).toBe(401);
    expect((await request(app).post('/recommendations/monthly').send(validBody)).status).toBe(401);
  });
});

describe('stress / concurrency', () => {
  it('handles 60 concurrent portfolio requests without failure', async () => {
    const strategies = ['dividend', 'growth', 'balanced'];
    const reqs = Array.from({ length: 60 }, (_, i) =>
      request(app)
        .post('/portfolio')
        .send({
          monthlyInvestmentAmount: 10000 + i * 1000,
          durationYears: 5 + (i % 25),
          strategy: strategies[i % 3],
          riskLevel: ['low', 'medium', 'high'][i % 3],
        })
    );
    const results = await Promise.all(reqs);
    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.holdings.length).toBeGreaterThan(0);
    }
  });

  it('mixes read/write endpoints concurrently', async () => {
    const ops = [
      ...Array.from({ length: 20 }, () => request(app).get('/companies')),
      ...Array.from({ length: 20 }, () => request(app).post('/sip').send(validBody)),
      ...Array.from({ length: 20 }, () => request(app).get('/market/status')),
    ];
    const results = await Promise.all(ops);
    const statusCounts = results.reduce<Record<number, number>>((counts, result) => {
      counts[result.status] = (counts[result.status] ?? 0) + 1;
      return counts;
    }, {});
    expect(statusCounts).toEqual({ 200: 60 });
  });
});
