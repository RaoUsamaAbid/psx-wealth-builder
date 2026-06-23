import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Single root .env for the monorepo. Workspace scripts run with cwd=apps/api,
// so resolve the root explicitly (3 levels up from apps/api/{src,dist}).
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });
loadEnv(); // also pick up a cwd-local .env if present (does not override)

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: num(process.env.API_PORT, 4000),
  host: process.env.API_HOST ?? '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI ?? '',
  mongoDb: process.env.MONGODB_DB ?? 'psx_wealth_builder',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  marketDataProvider: (process.env.MARKET_DATA_PROVIDER ?? 'realtime') as
    | 'mock'
    | 'simulated'
    | 'capitalstake'
    | 'realtime',
  marketRefreshMs: num(process.env.MARKET_REFRESH_MS, 5000),
  quoteFreshnessMs: num(process.env.QUOTE_FRESHNESS_MS, 20000),
  // Persist scraped live quotes to Mongo (overwriting seed quotes the engines
  // read). OFF until the scraper's column mapping is validated against the live
  // PSX DOM — otherwise a mis-parse corrupts engine inputs. Display is unaffected.
  marketPersist: (process.env.MARKET_PERSIST ?? 'false') === 'true',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
} as const;

if (config.env === 'production' && config.jwtSecret === 'dev-insecure-secret-change-me') {
  console.warn('[config] WARNING: JWT_SECRET is using the insecure default in production.');
}
