/**
 * Seed MongoDB from the @psx/market-data seed dataset.
 * Usage: npm run seed -w @psx/api   (or `npm run seed` at root)
 */
import { SEED_COMPANIES, SEED_QUOTES, SEED_FUNDAMENTALS, SEED_DIVIDENDS } from '@psx/market-data';
import { connectDb, closeDb } from './db.js';
import { makeRepositories, ensureIndexes } from './repositories.js';

async function main(): Promise<void> {
  const db = await connectDb();
  await ensureIndexes(db);
  const repos = makeRepositories(db);

  await repos.companies.upsertMany(SEED_COMPANIES);
  await repos.quotes.upsertMany(SEED_QUOTES);
  await repos.fundamentals.upsertMany(SEED_FUNDAMENTALS);
  await repos.dividends.upsertMany(SEED_DIVIDENDS);

  const count = await repos.companies.count();
  console.log(
    `[seed] companies=${SEED_COMPANIES.length} quotes=${SEED_QUOTES.length} ` +
      `fundamentals=${SEED_FUNDAMENTALS.length} dividends=${SEED_DIVIDENDS.length}`
  );
  console.log(`[seed] companies in DB: ${count}`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[seed] failed:', err);
    await closeDb();
    process.exit(1);
  });
