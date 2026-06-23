import type { Db, Collection } from 'mongodb';
import type { Company, Quote, Fundamentals, Dividend, Index, CompanyData } from '@psx/shared';

export const COLLECTIONS = {
  companies: 'companies',
  quotes: 'quotes',
  fundamentals: 'fundamentals',
  dividends: 'dividends',
} as const;

/** MongoDB stores these without the driver's _id leaking into the domain type. */
type Doc<T> = T & { _id?: never };

export interface CompanyFilter {
  index?: Index;
  sector?: string;
  shariahOnly?: boolean;
}

export class CompanyRepository {
  private readonly col: Collection<Doc<Company>>;
  constructor(db: Db) {
    this.col = db.collection(COLLECTIONS.companies);
  }

  async findAll(filter: CompanyFilter = {}): Promise<Company[]> {
    const q: Record<string, unknown> = {};
    if (filter.index) q.indices = filter.index;
    if (filter.sector) q.sector = filter.sector;
    if (filter.shariahOnly) q.shariahCompliant = true;
    return this.col
      .find(q, { projection: { _id: 0 } })
      .sort({ marketCap: -1 })
      .toArray();
  }

  async findBySymbol(symbol: string): Promise<Company | null> {
    return this.col.findOne({ symbol }, { projection: { _id: 0 } });
  }

  async count(): Promise<number> {
    return this.col.countDocuments();
  }

  async upsertMany(companies: Company[]): Promise<void> {
    if (companies.length === 0) return;
    await this.col.bulkWrite(
      companies.map((c) => ({
        updateOne: { filter: { symbol: c.symbol }, update: { $set: c }, upsert: true },
      }))
    );
  }
}

export class QuoteRepository {
  private readonly col: Collection<Doc<Quote>>;
  constructor(db: Db) {
    this.col = db.collection(COLLECTIONS.quotes);
  }

  async findBySymbol(symbol: string): Promise<Quote | null> {
    return this.col.findOne({ symbol }, { projection: { _id: 0 } });
  }

  async findAll(): Promise<Quote[]> {
    return this.col.find({}, { projection: { _id: 0 } }).toArray();
  }

  async upsertMany(quotes: Quote[]): Promise<void> {
    if (quotes.length === 0) return;
    await this.col.bulkWrite(
      quotes.map((q) => ({
        updateOne: { filter: { symbol: q.symbol }, update: { $set: q }, upsert: true },
      }))
    );
  }
}

export class FundamentalsRepository {
  private readonly col: Collection<Doc<Fundamentals>>;
  constructor(db: Db) {
    this.col = db.collection(COLLECTIONS.fundamentals);
  }

  async findBySymbol(symbol: string): Promise<Fundamentals | null> {
    return this.col.findOne({ symbol }, { projection: { _id: 0 } });
  }

  async findAll(): Promise<Fundamentals[]> {
    return this.col.find({}, { projection: { _id: 0 } }).toArray();
  }

  async upsertMany(rows: Fundamentals[]): Promise<void> {
    if (rows.length === 0) return;
    await this.col.bulkWrite(
      rows.map((f) => ({
        updateOne: { filter: { symbol: f.symbol }, update: { $set: f }, upsert: true },
      }))
    );
  }
}

export class DividendRepository {
  private readonly col: Collection<Doc<Dividend>>;
  constructor(db: Db) {
    this.col = db.collection(COLLECTIONS.dividends);
  }

  async findBySymbol(symbol: string): Promise<Dividend[]> {
    return this.col
      .find({ symbol }, { projection: { _id: 0 } })
      .sort({ year: 1 })
      .toArray();
  }

  async findAll(): Promise<Dividend[]> {
    return this.col.find({}, { projection: { _id: 0 } }).toArray();
  }

  async upsertMany(rows: Dividend[]): Promise<void> {
    if (rows.length === 0) return;
    await this.col.bulkWrite(
      rows.map((d) => ({
        updateOne: {
          filter: { symbol: d.symbol, year: d.year },
          update: { $set: d },
          upsert: true,
        },
      }))
    );
  }
}

/** Create unique indexes. Idempotent — safe to call on every boot/seed. */
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection(COLLECTIONS.companies).createIndex({ symbol: 1 }, { unique: true });
  await db.collection(COLLECTIONS.companies).createIndex({ indices: 1 });
  await db.collection(COLLECTIONS.quotes).createIndex({ symbol: 1 }, { unique: true });
  await db.collection(COLLECTIONS.fundamentals).createIndex({ symbol: 1 }, { unique: true });
  await db.collection(COLLECTIONS.dividends).createIndex({ symbol: 1, year: 1 }, { unique: true });
}

export interface Repositories {
  companies: CompanyRepository;
  quotes: QuoteRepository;
  fundamentals: FundamentalsRepository;
  dividends: DividendRepository;
}

export function makeRepositories(db: Db): Repositories {
  return {
    companies: new CompanyRepository(db),
    quotes: new QuoteRepository(db),
    fundamentals: new FundamentalsRepository(db),
    dividends: new DividendRepository(db),
  };
}

/**
 * Load the full candidate universe (company + fundamentals + quote + dividend
 * history) in four bulk queries, joined in memory by symbol.
 */
export async function loadUniverse(repos: Repositories): Promise<CompanyData[]> {
  const [companies, fundamentals, quotes, dividends] = await Promise.all([
    repos.companies.findAll(),
    repos.fundamentals.findAll(),
    repos.quotes.findAll(),
    repos.dividends.findAll(),
  ]);

  const fBySym = new Map(fundamentals.map((f) => [f.symbol, f]));
  const qBySym = new Map(quotes.map((q) => [q.symbol, q]));
  const dBySym = new Map<string, Dividend[]>();
  for (const d of dividends) {
    const arr = dBySym.get(d.symbol);
    if (arr) arr.push(d);
    else dBySym.set(d.symbol, [d]);
  }

  return companies.map((company) => ({
    company,
    fundamentals: fBySym.get(company.symbol) ?? null,
    quote: qBySym.get(company.symbol) ?? null,
    dividends: dBySym.get(company.symbol) ?? [],
  }));
}
