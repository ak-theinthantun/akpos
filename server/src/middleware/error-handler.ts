import type { NextFunction, Request, Response } from 'express';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';

  console.error('AKPOS request failed');
  console.error(error);

  if (res.headersSent) {
    return;
  }

  const statusCode = message.toLowerCase().includes('not allowed by cors') ? 403 : 500;

  res.status(statusCode).json({
    ok: false,
    message,
  });
}

