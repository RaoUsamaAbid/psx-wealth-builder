import { type Db, type Collection, ObjectId } from 'mongodb';
import type { PortfolioRequest } from '@psx/shared';

const ACCOUNT_COLLECTIONS = {
  users: 'users',
  savedPortfolios: 'savedPortfolios',
  watchlist: 'watchlist',
  history: 'investmentHistory',
  sipPlans: 'sipPlans',
  sipTransactions: 'sipTransactions',
  sipCycles: 'sipCycles',
} as const;

export interface UserDoc {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface SavedPortfolioDoc {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  request: PortfolioRequest;
  createdAt: string;
}

export interface WatchlistDoc {
  _id?: ObjectId;
  userId: ObjectId;
  symbol: string;
  createdAt: string;
}

export interface HistoryDoc {
  _id?: ObjectId;
  userId: ObjectId;
  symbol: string;
  shares: number;
  price: number;
  date: string; // ISO
  note?: string;
  createdAt: string;
}

export type SipPlanStatus = 'active' | 'paused' | 'completed';
export type SipTransactionType = 'buy' | 'sell' | 'dividend' | 'fee';

export interface SipPlanDoc {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  request: PortfolioRequest;
  carriedCash: number;
  estimatedFeeRate: number;
  maxOrders: number;
  nextInvestmentDate: string | null;
  lastInvestedAt: string | null;
  status: SipPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SipTransactionDoc {
  _id?: ObjectId;
  userId: ObjectId;
  sipPlanId: ObjectId;
  type: SipTransactionType;
  symbol?: string;
  shares?: number;
  price?: number;
  amount: number;
  fees: number;
  date: string;
  note?: string;
  createdAt: string;
}

interface SipCycleDoc {
  _id?: ObjectId;
  userId: ObjectId;
  sipPlanId: ObjectId;
  cycleKey: string;
  createdAt: string;
}

export class UserRepository {
  private readonly col: Collection<UserDoc>;
  constructor(db: Db) {
    this.col = db.collection(ACCOUNT_COLLECTIONS.users);
  }
  findByEmail(email: string): Promise<UserDoc | null> {
    return this.col.findOne({ email });
  }
  findById(id: string): Promise<UserDoc | null> {
    if (!ObjectId.isValid(id)) return Promise.resolve(null);
    return this.col.findOne({ _id: new ObjectId(id) });
  }
  async create(email: string, passwordHash: string): Promise<UserDoc> {
    const doc: UserDoc = { email, passwordHash, createdAt: new Date().toISOString() };
    const res = await this.col.insertOne(doc);
    return { ...doc, _id: res.insertedId };
  }
}

export class SavedPortfolioRepository {
  private readonly col: Collection<SavedPortfolioDoc>;
  constructor(db: Db) {
    this.col = db.collection(ACCOUNT_COLLECTIONS.savedPortfolios);
  }
  listByUser(userId: string): Promise<SavedPortfolioDoc[]> {
    return this.col
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
  }
  async create(
    userId: string,
    name: string,
    request: PortfolioRequest
  ): Promise<SavedPortfolioDoc> {
    const doc: SavedPortfolioDoc = {
      userId: new ObjectId(userId),
      name,
      request,
      createdAt: new Date().toISOString(),
    };
    const res = await this.col.insertOne(doc);
    return { ...doc, _id: res.insertedId };
  }
  findOne(userId: string, id: string): Promise<SavedPortfolioDoc | null> {
    if (!ObjectId.isValid(id)) return Promise.resolve(null);
    return this.col.findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  }
  async delete(userId: string, id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const res = await this.col.deleteOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
    return res.deletedCount === 1;
  }
}

export class WatchlistRepository {
  private readonly col: Collection<WatchlistDoc>;
  constructor(db: Db) {
    this.col = db.collection(ACCOUNT_COLLECTIONS.watchlist);
  }
  listByUser(userId: string): Promise<WatchlistDoc[]> {
    return this.col
      .find({ userId: new ObjectId(userId) })
      .sort({ symbol: 1 })
      .toArray();
  }
  async add(userId: string, symbol: string): Promise<void> {
    await this.col.updateOne(
      { userId: new ObjectId(userId), symbol },
      { $setOnInsert: { createdAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  async remove(userId: string, symbol: string): Promise<boolean> {
    const res = await this.col.deleteOne({ userId: new ObjectId(userId), symbol });
    return res.deletedCount === 1;
  }
}

export class HistoryRepository {
  private readonly col: Collection<HistoryDoc>;
  constructor(db: Db) {
    this.col = db.collection(ACCOUNT_COLLECTIONS.history);
  }
  listByUser(userId: string): Promise<HistoryDoc[]> {
    return this.col
      .find({ userId: new ObjectId(userId) })
      .sort({ date: -1 })
      .toArray();
  }
  async create(
    userId: string,
    entry: { symbol: string; shares: number; price: number; date: string; note?: string }
  ): Promise<HistoryDoc> {
    const doc: HistoryDoc = {
      userId: new ObjectId(userId),
      ...entry,
      createdAt: new Date().toISOString(),
    };
    const res = await this.col.insertOne(doc);
    return { ...doc, _id: res.insertedId };
  }
  async delete(userId: string, id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const res = await this.col.deleteOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
    return res.deletedCount === 1;
  }
}

export class SipPlanRepository {
  private readonly col: Collection<SipPlanDoc>;
  constructor(db: Db) {
    this.col = db.collection(ACCOUNT_COLLECTIONS.sipPlans);
  }
  listByUser(userId: string): Promise<SipPlanDoc[]> {
    return this.col
      .find({ userId: new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .toArray();
  }
  findOne(userId: string, id: string): Promise<SipPlanDoc | null> {
    if (!ObjectId.isValid(id)) return Promise.resolve(null);
    return this.col.findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  }
  async create(
    userId: string,
    input: {
      name: string;
      request: PortfolioRequest;
      estimatedFeeRate: number;
      maxOrders: number;
      nextInvestmentDate: string | null;
    }
  ): Promise<SipPlanDoc> {
    const now = new Date().toISOString();
    const doc: SipPlanDoc = {
      userId: new ObjectId(userId),
      ...input,
      carriedCash: 0,
      lastInvestedAt: null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }
  async recordCycle(
    userId: string,
    id: string,
    carriedCash: number,
    investedAt: string,
    nextInvestmentDate: string | null
  ): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.col.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      {
        $set: {
          carriedCash,
          lastInvestedAt: investedAt,
          nextInvestmentDate,
          updatedAt: investedAt,
        },
      }
    );
    return result.matchedCount === 1;
  }
  async delete(userId: string, id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.col.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    });
    return result.deletedCount === 1;
  }
}

export class SipTransactionRepository {
  private readonly col: Collection<SipTransactionDoc>;
  constructor(db: Db) {
    this.col = db.collection(ACCOUNT_COLLECTIONS.sipTransactions);
  }
  listByPlan(userId: string, sipPlanId: string): Promise<SipTransactionDoc[]> {
    if (!ObjectId.isValid(sipPlanId)) return Promise.resolve([]);
    return this.col
      .find({ userId: new ObjectId(userId), sipPlanId: new ObjectId(sipPlanId) })
      .sort({ date: -1, createdAt: -1 })
      .toArray();
  }
  async createMany(
    userId: string,
    sipPlanId: string,
    entries: Omit<SipTransactionDoc, '_id' | 'userId' | 'sipPlanId' | 'createdAt'>[]
  ): Promise<void> {
    if (!ObjectId.isValid(sipPlanId) || entries.length === 0) return;
    const createdAt = new Date().toISOString();
    await this.col.insertMany(
      entries.map((entry) => ({
        ...entry,
        userId: new ObjectId(userId),
        sipPlanId: new ObjectId(sipPlanId),
        createdAt,
      }))
    );
  }
  async deleteByPlan(userId: string, sipPlanId: string): Promise<void> {
    if (!ObjectId.isValid(sipPlanId)) return;
    await this.col.deleteMany({
      userId: new ObjectId(userId),
      sipPlanId: new ObjectId(sipPlanId),
    });
  }
}

export class SipCycleRepository {
  private readonly col: Collection<SipCycleDoc>;
  constructor(db: Db) {
    this.col = db.collection(ACCOUNT_COLLECTIONS.sipCycles);
  }
  async claim(userId: string, sipPlanId: string, cycleKey: string): Promise<boolean> {
    if (!ObjectId.isValid(sipPlanId)) return false;
    try {
      await this.col.insertOne({
        userId: new ObjectId(userId),
        sipPlanId: new ObjectId(sipPlanId),
        cycleKey,
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: number }).code === 11000
      ) {
        return false;
      }
      throw error;
    }
  }
  async release(userId: string, sipPlanId: string, cycleKey: string): Promise<void> {
    if (!ObjectId.isValid(sipPlanId)) return;
    await this.col.deleteOne({
      userId: new ObjectId(userId),
      sipPlanId: new ObjectId(sipPlanId),
      cycleKey,
    });
  }
  async deleteByPlan(userId: string, sipPlanId: string): Promise<void> {
    if (!ObjectId.isValid(sipPlanId)) return;
    await this.col.deleteMany({
      userId: new ObjectId(userId),
      sipPlanId: new ObjectId(sipPlanId),
    });
  }
}

export interface AccountRepositories {
  users: UserRepository;
  savedPortfolios: SavedPortfolioRepository;
  watchlist: WatchlistRepository;
  history: HistoryRepository;
  sipPlans: SipPlanRepository;
  sipTransactions: SipTransactionRepository;
  sipCycles: SipCycleRepository;
}

export function makeAccountRepositories(db: Db): AccountRepositories {
  return {
    users: new UserRepository(db),
    savedPortfolios: new SavedPortfolioRepository(db),
    watchlist: new WatchlistRepository(db),
    history: new HistoryRepository(db),
    sipPlans: new SipPlanRepository(db),
    sipTransactions: new SipTransactionRepository(db),
    sipCycles: new SipCycleRepository(db),
  };
}

export async function ensureAccountIndexes(db: Db): Promise<void> {
  await db.collection(ACCOUNT_COLLECTIONS.users).createIndex({ email: 1 }, { unique: true });
  await db.collection(ACCOUNT_COLLECTIONS.savedPortfolios).createIndex({ userId: 1 });
  await db
    .collection(ACCOUNT_COLLECTIONS.watchlist)
    .createIndex({ userId: 1, symbol: 1 }, { unique: true });
  await db.collection(ACCOUNT_COLLECTIONS.history).createIndex({ userId: 1, date: -1 });
  await db.collection(ACCOUNT_COLLECTIONS.sipPlans).createIndex({ userId: 1, updatedAt: -1 });
  await db
    .collection(ACCOUNT_COLLECTIONS.sipTransactions)
    .createIndex({ userId: 1, sipPlanId: 1, date: -1 });
  await db
    .collection(ACCOUNT_COLLECTIONS.sipCycles)
    .createIndex({ userId: 1, sipPlanId: 1, cycleKey: 1 }, { unique: true });
}
