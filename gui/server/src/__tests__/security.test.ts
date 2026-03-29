import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { securityMiddleware, assertSafePath, errorHandler } from '../../middleware/security.js';
import path from 'node:path';

function mockReq(hostname: string): Partial<Request> {
  return { hostname } as Partial<Request>;
}
function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe('securityMiddleware', () => {
  it('calls next() for localhost', () => {
    const next = vi.fn() as NextFunction;
    securityMiddleware(mockReq('localhost') as Request, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next() for 127.0.0.1', () => {
    const next = vi.fn() as NextFunction;
    securityMiddleware(mockReq('127.0.0.1') as Request, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 400 for foreign host', () => {
    const next = vi.fn() as NextFunction;
    const res = mockRes();
    securityMiddleware(mockReq('evil.com') as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid host header' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('assertSafePath', () => {
  const BASE = path.resolve('/safe/base');
  const guard = assertSafePath(BASE);

  it('returns resolved path for valid input', () => {
    const result = guard('file.json');
    expect(result).toBe(path.join(BASE, 'file.json'));
  });

  it('throws 403 for ../ traversal', () => {
    expect(() => guard('../outside.json')).toThrow('Path traversal attempt');
    try {
      guard('../outside.json');
    } catch (e: any) {
      expect(e.status).toBe(403);
    }
  });

  it('throws 403 for deep traversal', () => {
    expect(() => guard('../../etc/passwd')).toThrow();
  });
});

describe('errorHandler', () => {
  it('does not expose stack traces', () => {
    const err = Object.assign(new Error('Something broke'), { status: 500 });
    err.stack = 'Error: Something broke\n    at Object.<anonymous> (server.ts:10:3)';
    const res = mockRes();
    errorHandler(err, {} as Request, res, vi.fn() as NextFunction);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg).not.toHaveProperty('stack');
    expect(callArg.error).toBe('Something broke');
  });
});
