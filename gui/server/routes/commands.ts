import { Router } from 'express';
import { z } from 'zod';
import {
  ALLOWLISTED_CMDLETS,
  type RunCommandRequest,
} from '../../shared/types/commands.js';
import {
  isRunning,
  runCommand,
  stopCommand,
  getHistory,
  checkPwshAvailable,
} from '../services/commands.js';

const router = Router();

// Zod schema — validates cmdlet BEFORE any process spawn (security decision per CONTEXT.md)
const RunRequestSchema = z.object({
  cmdlet: z.enum(ALLOWLISTED_CMDLETS),               // SECURITY: allowlist enforced here
  parameters: z.record(z.string(), z.unknown()).default({}),
});

// POST /api/commands/run — streams text/event-stream response
// Client uses fetch + ReadableStream (not EventSource — EventSource is GET-only)
router.post('/run', async (req, res, next) => {
  try {
    const parsed = RunRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = Object.assign(new Error('Invalid or disallowed cmdlet'), { status: 400 });
      return next(err);
    }

    if (isRunning()) {
      const err = Object.assign(
        new Error('A command is already running. Stop it before starting a new one.'),
        { status: 409 },
      );
      return next(err);
    }

    const { cmdlet, parameters } = parsed.data as RunCommandRequest;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // start stream immediately

    function sendEvent(type: string, data: string): void {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    }

    runCommand(
      cmdlet,
      parameters,
      (event) => sendEvent(event.type, event.data),
      () => res.end(),
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/commands/stop — kills active process
router.post('/stop', (_req, res) => {
  const timeStr = stopCommand();
  if (!timeStr) {
    res.json({ stopped: false });
    return;
  }
  const message = `[Stopped by user at ${timeStr}]`;
  res.json({ stopped: true, message });
});

// GET /api/commands/history — returns persisted run history
router.get('/history', async (_req, res, next) => {
  try {
    const records = await getHistory();
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

// GET /api/commands/health — checks pwsh availability
router.get('/health', (_req, res) => {
  const status = checkPwshAvailable();
  res.json(status);
});

export { router as commandsRouter };
