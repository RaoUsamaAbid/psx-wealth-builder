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

const INSECURE_JWT = 'dev-insecure-secret-change-me';

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  // PaaS platforms inject PORT; fall back to API_PORT then 4000.
  port: num(process.env.PORT ?? process.env.API_PORT, 4000),
  host: process.env.API_HOST ?? '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI ?? '',
  mongoDb: process.env.MONGODB_DB ?? 'psx_wealth_builder',
  // How often the realtime board re-reads last-synced quotes from the DB.
  marketRefreshMs: num(process.env.MARKET_REFRESH_MS, 5000),
  quoteFreshnessMs: num(process.env.QUOTE_FRESHNESS_MS, 20000),
  jwtSecret: process.env.JWT_SECRET ?? INSECURE_JWT,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
} as const;

/**
 * Fail fast in production on missing/insecure critical config. Called once at
 * startup (not at import) so tests and tooling can load the module freely.
 */
export function validateConfig(): void {
  if (!config.isProd) return;
  const errors: string[] = [];
  if (!config.mongoUri) errors.push('MONGODB_URI is required');
  if (config.jwtSecret === INSECURE_JWT || config.jwtSecret.length < 16) {
    errors.push('JWT_SECRET must be set to a strong (16+ char) secret');
  }
  if (errors.length) {
    throw new Error(`[config] invalid production configuration:\n  - ${errors.join('\n  - ')}`);
  }
}
