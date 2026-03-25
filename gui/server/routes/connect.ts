import { Router } from 'express';
import { z } from 'zod';
import { AUTH_TYPES } from '../../shared/types/connect.js';
import {
  runConnect,
  disconnectEntraOps,
  getConnectionStatus,
  isConnecting,
} from '../services/connect.js';

const router = Router();

const ConnectRequestSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  authType: z.enum(AUTH_TYPES).default('DeviceAuthentication'),
});

// POST /api/connect/start — SSE stream for Connect-EntraOps auth flow
router.post('/start', async (req, res, next) => {
  try {
    const parsed = ConnectRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = Object.assign(new Error('Invalid connect request: tenant name is required'), { status: 400 });
      return next(err);
    }
    if (isConnecting()) {
      const err = Object.assign(new Error('Connection already in progress'), { status: 409 });
      return next(err);
    }

    const { tenantName, authType } = parsed.data;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    function sendEvent(type: string, data: string): void {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    }

    runConnect(
      tenantName,
      authType,
      (event) => sendEvent(event.type, event.data),
      () => res.end(),
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/connect/disconnect — runs Disconnect-EntraOps, returns { disconnected: true }
router.post('/disconnect', (_req, res, next) => {
  try {
    let output = '';
    disconnectEntraOps(
      (event) => {
        if (event.type === 'stdout' || event.type === 'stderr') output += event.data;
      },
      () => res.json({ disconnected: true, output }),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/connect/status — returns { connected: boolean, tenantName: string | null }
router.get('/status', (_req, res) => {
  res.json(getConnectionStatus());
});

export { router as connectRouter };
