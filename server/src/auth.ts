import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db, type User } from './store.js';

const SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-in-production';

export interface AuthedRequest extends Request {
  user?: User;
}

export function signToken(user: User): string {
  return jwt.sign({ sub: user.id }, SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Sign in required.' });
    return;
  }
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    const user = db.users.get(payload.sub);
    if (!user) throw new Error('unknown user');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired — please sign in again.' });
  }
}
