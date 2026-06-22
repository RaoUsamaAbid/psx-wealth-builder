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
  marketDataProvider: (process.env.MARKET_DATA_PROVIDER ?? 'mock') as
    | 'mock'
    | 'capitalstake'
    | 'realtime',
} as const;
