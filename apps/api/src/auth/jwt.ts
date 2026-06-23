import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  const options: jwt.SignOptions = {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId }, config.jwtSecret, options);
}

function verify(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === 'object' && payload && typeof payload.sub === 'string') {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}

/** Express middleware: require a valid Bearer token; sets req.userId. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? verify(token) : null;
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  req.userId = userId;
  next();
}
