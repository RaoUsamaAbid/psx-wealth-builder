import type { Company } from '@psx/shared';

/**
 * Seed universe of PSX Shariah-compliant companies.
 *
 * All names below are constituents of the KSE-Meezan indices (KMI), which are
 * Shariah-screened by construction — hence `shariahCompliant: true` for every
 * entry. `KMI30` marks the ~30 large-cap blue chips; every KMI30 name is also a
 * KMI100 member. Remaining names are KMI100-only mid caps.
 *
 * marketCap is an APPROXIMATE value in PKR, for seeding/ranking only. Real
 * figures (and live index membership) are scraped in Phase 9.
 */
const B = 1_000_000_000; // 1 PKR billion

interface SeedRow {
  symbol: string;
  companyName: string;
  sector: string;
  marketCapB: number; // approx market cap in PKR billions
  kmi30: boolean;
}

const ROWS: SeedRow[] = [
  // ----- KMI30 large caps -----
  {
    symbol: 'OGDC',
    companyName: 'Oil & Gas Development Company',
    sector: 'Oil & Gas Exploration',
    marketCapB: 600,
    kmi30: true,
  },
  {
    symbol: 'PPL',
    companyName: 'Pakistan Petroleum Limited',
    sector: 'Oil & Gas Exploration',
    marketCapB: 340,
    kmi30: true,
  },
  {
    symbol: 'MARI',
    companyName: 'Mari Petroleum Company',
    sector: 'Oil & Gas Exploration',
    marketCapB: 320,
    kmi30: true,
  },
  {
    symbol: 'POL',
    companyName: 'Pakistan Oilfields Limited',
    sector: 'Oil & Gas Exploration',
    marketCapB: 150,
    kmi30: true,
  },
  {
    symbol: 'MEBL',
    companyName: 'Meezan Bank Limited',
    sector: 'Islamic Banking',
    marketCapB: 430,
    kmi30: true,
  },
  {
    symbol: 'LUCK',
    companyName: 'Lucky Cement Limited',
    sector: 'Cement',
    marketCapB: 280,
    kmi30: true,
  },
  {
    symbol: 'ENGRO',
    companyName: 'Engro Corporation Limited',
    sector: 'Conglomerate',
    marketCapB: 230,
    kmi30: true,
  },
  {
    symbol: 'EFERT',
    companyName: 'Engro Fertilizers Limited',
    sector: 'Fertilizer',
    marketCapB: 250,
    kmi30: true,
  },
  {
    symbol: 'FFC',
    companyName: 'Fauji Fertilizer Company',
    sector: 'Fertilizer',
    marketCapB: 480,
    kmi30: true,
  },
  {
    symbol: 'PSO',
    companyName: 'Pakistan State Oil Company',
    sector: 'Oil & Gas Marketing',
    marketCapB: 170,
    kmi30: true,
  },
  {
    symbol: 'HUBC',
    companyName: 'Hub Power Company',
    sector: 'Power Generation',
    marketCapB: 200,
    kmi30: true,
  },
  {
    symbol: 'SYS',
    companyName: 'Systems Limited',
    sector: 'Technology',
    marketCapB: 290,
    kmi30: true,
  },
  {
    symbol: 'PKGS',
    companyName: 'Packages Limited',
    sector: 'Paper & Board',
    marketCapB: 75,
    kmi30: true,
  },
  {
    symbol: 'INDU',
    companyName: 'Indus Motor Company',
    sector: 'Automobile Assembler',
    marketCapB: 130,
    kmi30: true,
  },
  {
    symbol: 'MTL',
    companyName: 'Millat Tractors Limited',
    sector: 'Automobile Assembler',
    marketCapB: 70,
    kmi30: true,
  },
  {
    symbol: 'COLG',
    companyName: 'Colgate-Palmolive Pakistan',
    sector: 'Personal Goods',
    marketCapB: 80,
    kmi30: true,
  },
  {
    symbol: 'NESTLE',
    companyName: 'Nestle Pakistan Limited',
    sector: 'Food & Personal Care',
    marketCapB: 340,
    kmi30: true,
  },
  {
    symbol: 'EPCL',
    companyName: 'Engro Polymer & Chemicals',
    sector: 'Chemicals',
    marketCapB: 110,
    kmi30: true,
  },
  {
    symbol: 'LOTCHEM',
    companyName: 'Lotte Chemical Pakistan',
    sector: 'Chemicals',
    marketCapB: 90,
    kmi30: true,
  },
  {
    symbol: 'DGKC',
    companyName: 'D. G. Khan Cement Company',
    sector: 'Cement',
    marketCapB: 55,
    kmi30: true,
  },
  {
    symbol: 'MLCF',
    companyName: 'Maple Leaf Cement Factory',
    sector: 'Cement',
    marketCapB: 60,
    kmi30: true,
  },
  {
    symbol: 'FCCL',
    companyName: 'Fauji Cement Company',
    sector: 'Cement',
    marketCapB: 65,
    kmi30: true,
  },
  {
    symbol: 'ATRL',
    companyName: 'Attock Refinery Limited',
    sector: 'Refinery',
    marketCapB: 45,
    kmi30: true,
  },
  {
    symbol: 'NRL',
    companyName: 'National Refinery Limited',
    sector: 'Refinery',
    marketCapB: 40,
    kmi30: true,
  },
  {
    symbol: 'SEARL',
    companyName: 'The Searle Company Limited',
    sector: 'Pharmaceuticals',
    marketCapB: 50,
    kmi30: true,
  },
  {
    symbol: 'ABOT',
    companyName: 'Abbott Laboratories Pakistan',
    sector: 'Pharmaceuticals',
    marketCapB: 70,
    kmi30: true,
  },
  {
    symbol: 'TRG',
    companyName: 'TRG Pakistan Limited',
    sector: 'Technology',
    marketCapB: 60,
    kmi30: true,
  },
  {
    symbol: 'ILP',
    companyName: 'Interloop Limited',
    sector: 'Textile',
    marketCapB: 95,
    kmi30: true,
  },
  {
    symbol: 'NML',
    companyName: 'Nishat Mills Limited',
    sector: 'Textile',
    marketCapB: 30,
    kmi30: true,
  },
  {
    symbol: 'THALL',
    companyName: 'Thal Limited',
    sector: 'Engineering',
    marketCapB: 28,
    kmi30: true,
  },

  // ----- KMI100-only mid caps -----
  {
    symbol: 'FATIMA',
    companyName: 'Fatima Fertilizer Company',
    sector: 'Fertilizer',
    marketCapB: 120,
    kmi30: false,
  },
  {
    symbol: 'KOHC',
    companyName: 'Kohat Cement Company',
    sector: 'Cement',
    marketCapB: 50,
    kmi30: false,
  },
  {
    symbol: 'PIOC',
    companyName: 'Pioneer Cement Limited',
    sector: 'Cement',
    marketCapB: 35,
    kmi30: false,
  },
  {
    symbol: 'CHCC',
    companyName: 'Cherat Cement Company',
    sector: 'Cement',
    marketCapB: 38,
    kmi30: false,
  },
  {
    symbol: 'NETSOL',
    companyName: 'NetSol Technologies Limited',
    sector: 'Technology',
    marketCapB: 22,
    kmi30: false,
  },
  {
    symbol: 'AVN',
    companyName: 'Avanceon Limited',
    sector: 'Technology',
    marketCapB: 18,
    kmi30: false,
  },
  {
    symbol: 'NATF',
    companyName: 'National Foods Limited',
    sector: 'Food & Personal Care',
    marketCapB: 32,
    kmi30: false,
  },
  {
    symbol: 'HINOON',
    companyName: 'Highnoon Laboratories Limited',
    sector: 'Pharmaceuticals',
    marketCapB: 28,
    kmi30: false,
  },
  {
    symbol: 'AGP',
    companyName: 'AGP Limited',
    sector: 'Pharmaceuticals',
    marketCapB: 26,
    kmi30: false,
  },
  {
    symbol: 'HCAR',
    companyName: 'Honda Atlas Cars Pakistan',
    sector: 'Automobile Assembler',
    marketCapB: 42,
    kmi30: false,
  },
  {
    symbol: 'GHGL',
    companyName: 'Ghani Glass Limited',
    sector: 'Glass & Ceramics',
    marketCapB: 24,
    kmi30: false,
  },
  {
    symbol: 'GATM',
    companyName: 'Gul Ahmed Textile Mills',
    sector: 'Textile',
    marketCapB: 20,
    kmi30: false,
  },
  {
    symbol: 'KTML',
    companyName: 'Kohinoor Textile Mills',
    sector: 'Textile',
    marketCapB: 19,
    kmi30: false,
  },
  {
    symbol: 'POML',
    companyName: 'Pakistan Oxygen Limited',
    sector: 'Chemicals',
    marketCapB: 15,
    kmi30: false,
  },
  {
    symbol: 'EFUG',
    companyName: 'EFU General Insurance',
    sector: 'Insurance',
    marketCapB: 36,
    kmi30: false,
  },
];

export const SEED_COMPANIES: Company[] = ROWS.map((r) => ({
  symbol: r.symbol,
  companyName: r.companyName,
  sector: r.sector,
  marketCap: r.marketCapB * B,
  shariahCompliant: true,
  indices: r.kmi30 ? ['KMI30', 'KMI100'] : ['KMI100'],
}));
