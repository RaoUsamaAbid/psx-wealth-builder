import type { CompanyData, Company, Dividend, Fundamentals, Index, Quote } from '@psx/shared';

interface Spec {
  symbol: string;
  sector: string;
  kmi30?: boolean;
  price: number;
  yield: number;
  epsGrowth: number;
  revGrowth: number;
  roe: number;
  pe: number;
  beta: number;
  debt: number;
  dps: number; // latest dividend per share
  divGrowth: number;
}

function build(s: Spec): CompanyData {
  const indices: Index[] = s.kmi30 ? ['KMI30', 'KMI100'] : ['KMI100'];
  const company: Company = {
    symbol: s.symbol,
    companyName: `${s.symbol} Ltd`,
    sector: s.sector,
    marketCap: s.price * 1_000_000,
    shariahCompliant: true,
    indices,
  };
  const fundamentals: Fundamentals = {
    symbol: s.symbol,
    eps: +(s.price / s.pe).toFixed(2),
    peRatio: s.pe,
    bookValue: +(s.price / 1.5).toFixed(2),
    roe: s.roe,
    epsGrowth: s.epsGrowth,
    revenueGrowth: s.revGrowth,
    dividendYield: s.yield,
    debtRatio: s.debt,
    beta: s.beta,
    asOf: '2026-01-01T00:00:00.000Z',
  };
  const quote: Quote = {
    symbol: s.symbol,
    price: s.price,
    change: 0,
    changePercent: 0,
    asOf: '2026-01-01T00:00:00.000Z',
  };
  // 5y of dividend history growing at divGrowth toward dps.
  const dividends: Dividend[] = [];
  for (let i = 4; i >= 0; i--) {
    dividends.push({
      symbol: s.symbol,
      year: 2025 - i,
      amountPerShare: +(s.dps / (1 + s.divGrowth) ** i).toFixed(2),
      payoutRatio: 0.5,
    });
  }
  return { company, fundamentals, quote, dividends };
}

/** A controlled 12-name universe spanning sectors, with clear archetypes. */
export function makeUniverse(): CompanyData[] {
  return [
    // High-yield income names
    build({
      symbol: 'FERT1',
      sector: 'Fertilizer',
      kmi30: true,
      price: 150,
      yield: 0.14,
      epsGrowth: 0.08,
      revGrowth: 0.09,
      roe: 0.3,
      pe: 7,
      beta: 0.8,
      debt: 0.2,
      dps: 21,
      divGrowth: 0.1,
    }),
    build({
      symbol: 'FERT2',
      sector: 'Fertilizer',
      price: 120,
      yield: 0.12,
      epsGrowth: 0.07,
      revGrowth: 0.08,
      roe: 0.28,
      pe: 7.5,
      beta: 0.85,
      debt: 0.25,
      dps: 14,
      divGrowth: 0.09,
    }),
    build({
      symbol: 'BANK1',
      sector: 'Islamic Banking',
      kmi30: true,
      price: 200,
      yield: 0.1,
      epsGrowth: 0.12,
      revGrowth: 0.14,
      roe: 0.22,
      pe: 6,
      beta: 0.95,
      debt: 0.1,
      dps: 20,
      divGrowth: 0.12,
    }),
    build({
      symbol: 'POWER1',
      sector: 'Power Generation',
      price: 90,
      yield: 0.13,
      epsGrowth: 0.05,
      revGrowth: 0.06,
      roe: 0.18,
      pe: 4,
      beta: 0.9,
      debt: 0.5,
      dps: 11.7,
      divGrowth: 0.05,
    }),
    // High-growth names
    build({
      symbol: 'TECH1',
      sector: 'Technology',
      kmi30: true,
      price: 300,
      yield: 0.02,
      epsGrowth: 0.32,
      revGrowth: 0.3,
      roe: 0.35,
      pe: 14,
      beta: 1.2,
      debt: 0.12,
      dps: 6,
      divGrowth: 0.15,
    }),
    build({
      symbol: 'TECH2',
      sector: 'Technology',
      price: 250,
      yield: 0.02,
      epsGrowth: 0.28,
      revGrowth: 0.27,
      roe: 0.32,
      pe: 13,
      beta: 1.25,
      debt: 0.13,
      dps: 5,
      divGrowth: 0.14,
    }),
    build({
      symbol: 'PHARMA1',
      sector: 'Pharmaceuticals',
      price: 180,
      yield: 0.04,
      epsGrowth: 0.18,
      revGrowth: 0.16,
      roe: 0.25,
      pe: 16,
      beta: 0.8,
      debt: 0.18,
      dps: 7,
      divGrowth: 0.12,
    }),
    // Cyclicals
    build({
      symbol: 'CEM1',
      sector: 'Cement',
      kmi30: true,
      price: 110,
      yield: 0.04,
      epsGrowth: 0.16,
      revGrowth: 0.14,
      roe: 0.2,
      pe: 8,
      beta: 1.3,
      debt: 0.42,
      dps: 4.4,
      divGrowth: 0.06,
    }),
    build({
      symbol: 'CEM2',
      sector: 'Cement',
      price: 95,
      yield: 0.045,
      epsGrowth: 0.15,
      revGrowth: 0.13,
      roe: 0.19,
      pe: 8.5,
      beta: 1.35,
      debt: 0.45,
      dps: 4.3,
      divGrowth: 0.06,
    }),
    build({
      symbol: 'OIL1',
      sector: 'Oil & Gas Exploration',
      kmi30: true,
      price: 220,
      yield: 0.08,
      epsGrowth: 0.07,
      revGrowth: 0.08,
      roe: 0.24,
      pe: 5,
      beta: 1.1,
      debt: 0.15,
      dps: 17.6,
      divGrowth: 0.07,
    }),
    build({
      symbol: 'OIL2',
      sector: 'Oil & Gas Exploration',
      price: 180,
      yield: 0.075,
      epsGrowth: 0.06,
      revGrowth: 0.07,
      roe: 0.22,
      pe: 5.5,
      beta: 1.12,
      debt: 0.16,
      dps: 13.5,
      divGrowth: 0.06,
    }),
    build({
      symbol: 'FOOD1',
      sector: 'Food & Personal Care',
      price: 400,
      yield: 0.03,
      epsGrowth: 0.14,
      revGrowth: 0.13,
      roe: 0.4,
      pe: 22,
      beta: 0.6,
      debt: 0.2,
      dps: 12,
      divGrowth: 0.12,
    }),
  ];
}
