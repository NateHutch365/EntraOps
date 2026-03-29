import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { assertSafePath } from '../middleware/security.js';
import type { TemplateName } from '../../shared/types/templates.js';
import { atomicWrite } from '../utils/atomicWrite.js';

const router = Router();

const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve(import.meta.dirname, '../../..');
const TEMPLATES_BASE = path.join(REPO_ROOT, 'Classification', 'Templates');
const GLOBAL_PATH = path.join(REPO_ROOT, 'Classification', 'Global.json');
const AUDIT_LOG_PATH = path.join(REPO_ROOT, 'Classification', 'audit-log.jsonl');

const safeTemplatePath = assertSafePath(TEMPLATES_BASE);

// Inline constant — avoids cross-workspace module resolution issues
const TEMPLATE_NAMES: TemplateName[] = [
  'Classification_AadResources',
  'Classification_AppRoles',
  'Classification_Defender',
  'Classification_DeviceManagement',
  'Classification_IdentityGovernance',
];

// Zod v4 schemas — use error: (not message:) for custom error strings
const TierLevelDefinitionEntrySchema = z.object({
  Category: z.string().min(1),
  Service: z.string().min(1),
  RoleAssignmentScopeName: z.array(z.string()),
  RoleDefinitionActions: z.array(z.string()),
});

const TierBlockSchema = z.object({
  EAMTierLevelName: z.enum(['ControlPlane', 'ManagementPlane', 'UserAccess']),
  EAMTierLevelTagValue: z.string(),
  TierLevelDefinition: z.array(TierLevelDefinitionEntrySchema),
});

const TemplateFileSchema = z.array(TierBlockSchema);

const GlobalFileSchema = z.array(
  z.object({ ExcludedPrincipalId: z.array(z.string()) })
);

const GlobalBodySchema = z.object({
  exclusions: z.array(z.string().uuid()),
});

function parseBomJson(raw: string): unknown {
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}


async function appendAuditEntry(entry: { action: string; template: string }): Promise<void> {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n';
  await fs.appendFile(AUDIT_LOG_PATH, line, 'utf-8');
}

// GET /api/templates — list available template names
router.get('/', (_req, res) => {
  res.json({ names: TEMPLATE_NAMES });
});

// GET /api/templates/audit — return audit log entries
router.get('/audit', async (_req, res, next) => {
  try {
    let entries: unknown[] = [];
    try {
      const raw = await fs.readFile(AUDIT_LOG_PATH, 'utf-8');
      entries = raw
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as unknown)
        .reverse(); // most recent first
    } catch {
      // File missing — return empty
    }
    res.json({ entries });
  } catch (err) {
    next(err);
  }
});
// GET /api/templates/global — MUST be before /:name to avoid param capture
router.get('/global', async (_req, res, next) => {
  try {
    let exclusions: string[] = [];
    try {
      const raw = await fs.readFile(GLOBAL_PATH, 'utf-8');
      const parsed = GlobalFileSchema.safeParse(parseBomJson(raw));
      if (parsed.success && parsed.data[0]?.ExcludedPrincipalId) {
        exclusions = parsed.data[0].ExcludedPrincipalId;
      }
    } catch {
      // File missing or unreadable — return empty exclusions
    }
    res.json({ exclusions });
  } catch (err) {
    next(err);
  }
});

// PUT /api/templates/global
router.put('/global', async (req, res, next) => {
  try {
    const parsed = GlobalBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const content = JSON.stringify(
      [{ ExcludedPrincipalId: parsed.data.exclusions }],
      null,
      2
    );
    await atomicWrite(GLOBAL_PATH, content);
    await appendAuditEntry({ action: 'save', template: 'global' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/templates/:name
router.get('/:name', async (req, res, next) => {
  try {
    const name = req.params.name as TemplateName;
    const filePath = safeTemplatePath(name + '.json'); // throws 403 on traversal
    if (!(TEMPLATE_NAMES as string[]).includes(name)) {
      res.status(400).json({ error: `Unknown template name: ${name}` });
      return;
    }
    const raw = await fs.readFile(filePath, 'utf-8');
    const json = parseBomJson(raw);
    const validated = TemplateFileSchema.safeParse(json);
    if (!validated.success) {
      res.status(400).json({ error: validated.error.flatten() });
      return;
    }
    res.json({ name, tiers: validated.data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/templates/:name
router.put('/:name', async (req, res, next) => {
  try {
    const name = req.params.name as TemplateName;
    const filePath = safeTemplatePath(name + '.json'); // throws 403 on traversal
    if (!(TEMPLATE_NAMES as string[]).includes(name)) {
      res.status(400).json({ error: `Unknown template name: ${name}` });
      return;
    }
    const validated = TemplateFileSchema.safeParse(req.body.tiers);
    if (!validated.success) {
      res.status(400).json({ error: validated.error.flatten() });
      return;
    }
    await atomicWrite(filePath, JSON.stringify(validated.data, null, 2));
    await appendAuditEntry({ action: 'save', template: name });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as templatesRouter };
