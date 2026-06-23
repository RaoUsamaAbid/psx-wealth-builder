import { pino } from 'pino';
import { config } from './config.js';

/** Structured JSON logger. Level via LOG_LEVEL (default info; debug in dev). */
export const logger = pino({
  level: process.env.VITEST
    ? 'silent'
    : (process.env.LOG_LEVEL ?? (config.env === 'production' ? 'info' : 'debug')),
  base: { app: 'psx-api' },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
