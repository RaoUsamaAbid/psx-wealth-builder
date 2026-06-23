import { type Db, type Collection, ObjectId } from 'mongodb';
import type { PortfolioRequest } from '@psx/shared';

export const ACCOUNT_COLLECTIONS = {
  users: 'users',
  savedPortfolios: 'savedPortfolios',
  watchlist: 'watchlist',
  history: 'investmentHistory',
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

export interface AccountRepositories {
  users: UserRepository;
  savedPortfolios: SavedPortfolioRepository;
  watchlist: WatchlistRepository;
  history: HistoryRepository;
}

export function makeAccountRepositories(db: Db): AccountRepositories {
  return {
    users: new UserRepository(db),
    savedPortfolios: new SavedPortfolioRepository(db),
    watchlist: new WatchlistRepository(db),
    history: new HistoryRepository(db),
  };
}

export async function ensureAccountIndexes(db: Db): Promise<void> {
  await db.collection(ACCOUNT_COLLECTIONS.users).createIndex({ email: 1 }, { unique: true });
  await db.collection(ACCOUNT_COLLECTIONS.savedPortfolios).createIndex({ userId: 1 });
  await db
    .collection(ACCOUNT_COLLECTIONS.watchlist)
    .createIndex({ userId: 1, symbol: 1 }, { unique: true });
  await db.collection(ACCOUNT_COLLECTIONS.history).createIndex({ userId: 1, date: -1 });
}
