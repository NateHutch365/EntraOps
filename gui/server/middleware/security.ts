import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!ALLOWED_HOSTS.has(req.hostname)) {
    res.status(400).json({ error: 'Invalid host header' });
    return;
  }
  next();
}

export function assertSafePath(baseDir: string) {
  return (requestedPath: string): string => {
    const resolved = path.resolve(baseDir, requestedPath);
    if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
      const err = Object.assign(new Error('Path traversal attempt'), { status: 403 });
      throw err;
    }
    return resolved;
  };
}

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  // SECURITY: never expose stack traces — send only err.message
  res.status(status).json({ error: err.message ?? 'Internal server error' });
}
