import { MongoClient, type Db } from 'mongodb';
import { config } from './config.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }
  client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db(config.mongoDb);
  return db;
}

export async function pingDb(): Promise<boolean> {
  try {
    const database = await connectDb();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
