import type { NextFunction, Request, Response } from 'express';
import { findSessionByToken } from '../persistence/auth-store';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: 'Missing bearer token.',
    });
  }

  const session = await findSessionByToken(token);
  if (!session) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid session token.',
    });
  }

  res.locals.auth = session;
  return next();
}

