import rateLimit from 'express-rate-limit';

const common = { standardHeaders: true, legacyHeaders: false } as const;

/** Generous global cap to blunt abuse without affecting normal use. */
export const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { error: 'too many requests, please slow down' },
});

/** Stricter cap on auth to slow credential stuffing / brute force. */
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { error: 'too many auth attempts, try again later' },
});

/** Tight cap on the scrape endpoints — each call hits PSX. */
export const syncLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { error: 'sync rate limit reached, try again later' },
});
