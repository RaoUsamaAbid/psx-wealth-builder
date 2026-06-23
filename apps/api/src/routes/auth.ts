import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../async-handler.js';
import { signToken, requireAuth, type AuthedRequest } from '../auth/jwt.js';
import type { AccountRepositories, UserDoc } from '../account/repos.js';

type AccountResolver = () => Promise<AccountRepositories>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function userPublic(u: UserDoc): { id: string; email: string; createdAt: string } {
  return { id: u._id!.toString(), email: u.email, createdAt: u.createdAt };
}

function parseCreds(body: unknown): { email?: string; password?: string; error?: string } {
  if (typeof body !== 'object' || body === null) return { error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  if (!EMAIL_RE.test(email)) return { error: 'a valid email is required' };
  if (password.length < 8) return { error: 'password must be at least 8 characters' };
  return { email, password };
}

export function authRouter(getAccount: AccountResolver): Router {
  const router = Router();

  // POST /auth/register
  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const { email, password, error } = parseCreds(req.body);
      if (!email || !password) {
        res.status(400).json({ error });
        return;
      }
      const account = await getAccount();
      if (await account.users.findByEmail(email)) {
        res.status(409).json({ error: 'email already registered' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await account.users.create(email, passwordHash);
      res.status(201).json({ token: signToken(user._id!.toString()), user: userPublic(user) });
    })
  );

  // POST /auth/login
  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const { email, password, error } = parseCreds(req.body);
      if (!email || !password) {
        res.status(400).json({ error });
        return;
      }
      const account = await getAccount();
      const user = await account.users.findByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'invalid email or password' });
        return;
      }
      res.json({ token: signToken(user._id!.toString()), user: userPublic(user) });
    })
  );

  // GET /auth/me
  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const user = await account.users.findById(req.userId!);
      if (!user) {
        res.status(404).json({ error: 'user not found' });
        return;
      }
      res.json({ user: userPublic(user) });
    })
  );

  return router;
}
