# Phase 06: Settings & Polish — Research

**Researched:** 2026-03-26
**Domain:** React form state management, Zod v4 schema derivation, Express atomic writes, shadcn/ui settings patterns, terminal output rendering
**Confidence:** HIGH (sourced from direct codebase inspection — no external library research needed; all tech already in use)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Form layout:** Single scrollable page with four section cards (Identity & Auth, Automation, Integrations, AD Management) — not tabs
- **Read-only fields:** `TenantId` and `TenantName` rendered as greyed-out text with Lock icon + Tooltip
- **Toggle-controlled sub-fields:** nested fields remain visible but disabled (not collapsed) when parent boolean is false
- **Cron picker:** Five inline `<select>` dropdowns — NO new npm dependency
- **Save pattern:** view-only default → "Edit Settings" unlock → "Preview Changes" (DiffDialog) → atomic write
- **DiffDialog reuse:** `before` = disk JSON, `after` = edited JSON (same DiffDialog from Phase 2)
- **Zod validation gates the diff:** validate full config object before DiffDialog opens
- **Dirty state:** persistent "Unsaved changes" amber badge in sticky page header
- **SaveBanner after save:** same SaveBanner component from Phase 2
- **Atomic write:** same temp-file → rename pattern as Phase 2 `atomicWrite()`
- **Three deferred bug fixes in scope:** DiffDialog overflow, TierAccordion disabled Preview, no visual feedback before edit
- **Terminal line spacing fix:** `leading-relaxed` → `leading-normal` + `\r` stripping
- **Sidebar nav audit in scope**
- **Empty state:** mini-form generator with live command preview, "Check again" re-fetch, "Show advanced options" disclosure

### Claude's Discretion
- Exact section card styling (border/background/padding)
- Icon choices for each sidebar nav entry
- Exact Zod schema shape for `EntraOpsConfig.json`
- Cron field dropdown option lists
- Loading skeleton for Settings page
- Copy-to-clipboard button styling on empty state code block

### Deferred Ideas (OUT OF SCOPE)
- Object-Level Reclassification (captured to todos)
- All v2 requirements not listed above
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETT-01 | Display `EntraOpsConfig.json` in a structured (non-raw) form | Section card layout with shadcn Card; Zod schema derivation from PowerShell parameter set |
| SETT-02 | Allow editing and saving of `EntraOpsConfig.json` | View-only → edit mode toggle; Zod gate before DiffDialog; `PUT /api/config` with atomicWrite |
| SETT-03 | Empty state when no config file exists, with instructions for `New-EntraOpsConfigFile` | Mini-form generator; controlled inputs → derived CLI string; Clipboard API; "Check again" re-fetch |
</phase_requirements>

---

## Summary

Phase 6 is a codebase-finalisation phase. All technology is already installed and in use — no new npm packages, no new architectural patterns. The key architectural question is form state management: **react-hook-form is NOT installed** and is not used anywhere in the codebase. The correct pattern is plain `useState` with a deep-copy draft, consistent with `GlobalExclusionsTab.tsx`. The DiffDialog and TierAccordion bugs listed as deferred are **partially or fully already fixed** in the current code — the plan must verify-first before re-implementing.

The three deferred bug fixes require careful pre-check. DiffDialog overflow (`max-h-[60vh] overflow-auto`) is already in `DiffDialog.tsx`. TierAccordion `disabled` prop is already in `TierAccordion.tsx`. The terminal `\r` bug and `leading-relaxed` are confirmed unfixed.

**Primary recommendation:** Use plain `useState` for form state, derive draft by spreading disk config, compute `isDirty` from `JSON.stringify` comparison, strip `\r` client-side at the `toHtml()` call site.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version (installed) | Purpose | Role in Phase 6 |
|---------|---------------------|---------|-----------------|
| `react` | ^19.0.0 | UI framework | `SettingsPage` component |
| `zod` | ^4.3.6 (client) / 4.3.6 (server) | Validation | Config schema validation on PUT; pre-save client guard |
| `shadcn/ui` (via `radix-ui`) | ^1.4.3 | Component library | Card, Switch, Input, Select, Badge, Tooltip, Dialog |
| `lucide-react` | 1.6.0 | Icons | Lock, Settings, AlertTriangle, Check, Copy |
| Tailwind CSS | 4.2.2 | Styling | Form layout, sticky header, disabled states |
| `ansi-to-html` | ^0.7.2 | Terminal ANSI → HTML | Already used; `\r` stripping applied at call site |

### No New Dependencies

The CONTEXT.md decision is firm: no new npm packages. Everything needed (clipboard API, cron picker, form state) uses existing tools.

**Clipboard API:** `navigator.clipboard.writeText(str)` — browser built-in, no library. Localhost app so HTTPS constraint is not an issue (localhost is an allowed secure context).

**Installation:** None required. All packages already in `gui/client/package.json`.

---

## Architecture Patterns

### Pattern 1: Form State — Plain useState (NOT react-hook-form)

**What:** `react-hook-form` is not installed and not used anywhere in this codebase. All existing form patterns (see `GlobalExclusionsTab.tsx`) use plain `useState`.

**How to use:**
```typescript
// SettingsPage.tsx — plain useState pattern (match GlobalExclusionsTab.tsx)
const [diskConfig, setDiskConfig] = useState<EntraOpsConfig | null>(null);
const [draft, setDraft] = useState<EntraOpsConfig | null>(null);
const [isEditing, setIsEditing] = useState(false);
const [isDirty, setIsDirty] = useState(false);

// When "Edit Settings" clicked:
function handleEditStart() {
  setDraft(structuredClone(diskConfig)); // deep copy
  setIsEditing(true);
}

// isDirty derived from JSON comparison — no useEffect needed, compute inline
const isDirty = isEditing && JSON.stringify(draft) !== JSON.stringify(diskConfig);
```

**Key insight:** `structuredClone()` (Node 17+ / all modern browsers) gives a safe deep copy without a library. No need for lodash/cloneDeep.

### Pattern 2: Zod v4 Config Schema

**What:** Derive a Zod schema from `New-EntraOpsConfigFile.ps1` parameter set and `$EnvConfigSchema` ordered hashtable (lines ~120–190 of the PS1 file).

**Zod v4 critical difference:** Use `error:` not `message:` for custom error strings in Zod v4. (From STATE.md.)

```typescript
// gui/server/routes/config.ts — Zod v4 schema (server-side validation)
import { z } from 'zod';

const AuthTypeEnum = z.enum([
  'UserInteractive', 'SystemAssignedMSI', 'UserAssignedMSI',
  'FederatedCredentials', 'AlreadyAuthenticated', 'DeviceAuthentication'
]);

const DevOpsPlatformEnum = z.enum(['AzureDevOps', 'GitHub', 'None']);

const RbacSystemEnum = z.enum([
  'Azure', 'AzureBilling', 'EntraID', 'IdentityGovernance',
  'DeviceManagement', 'ResourceApps', 'Defender'
]);

export const EntraOpsConfigSchema = z.object({
  TenantId: z.string(),
  TenantName: z.string(),
  AuthenticationType: AuthTypeEnum,
  ClientId: z.string(),
  DevOpsPlatform: DevOpsPlatformEnum,
  RbacSystems: z.array(RbacSystemEnum),
  WorkflowTrigger: z.object({
    PullScheduledTrigger: z.boolean(),
    PullScheduledCron: z.string(),
    PushAfterPullWorkflowTrigger: z.boolean(),
  }),
  AutomatedControlPlaneScopeUpdate: z.object({
    ApplyAutomatedControlPlaneScopeUpdate: z.boolean(),
    PrivilegedObjectClassificationSource: z.array(z.string()),
    EntraOpsScopes: z.array(z.string()),
    AzureHighPrivilegedRoles: z.array(z.string()),
    AzureHighPrivilegedScopes: z.array(z.string()),
    ExposureCriticalityLevel: z.string(),
  }),
  AutomatedClassificationUpdate: z.object({
    ApplyAutomatedClassificationUpdate: z.boolean(),
    Classifications: z.array(z.string()),
  }),
  AutomatedEntraOpsUpdate: z.object({
    ApplyAutomatedEntraOpsUpdate: z.boolean(),
    UpdateScheduledTrigger: z.boolean(),
    UpdateScheduledCron: z.string(),
  }),
  LogAnalytics: z.object({
    IngestToLogAnalytics: z.boolean(),
    DataCollectionRuleName: z.string(),
    DataCollectionRuleSubscriptionId: z.string(),
    DataCollectionResourceGroupName: z.string(),
    TableName: z.string(),
  }),
  SentinelWatchLists: z.object({
    IngestToWatchLists: z.boolean(),
    WatchListTemplates: z.array(z.string()),
    WatchListWorkloadIdentity: z.array(z.string()),
    SentinelWorkspaceName: z.string(),
    SentinelSubscriptionId: z.string(),
    SentinelResourceGroupName: z.string(),
    WatchListPrefix: z.string(),
  }),
  AutomatedAdministrativeUnitManagement: z.object({
    ApplyAdministrativeUnitAssignments: z.boolean(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    RbacSystems: z.array(z.string()),
    RestrictedAuMode: z.string(),
  }),
  AutomatedConditionalAccessTargetGroups: z.object({
    ApplyConditionalAccessTargetGroups: z.boolean(),
    AdminUnitName: z.string(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    GroupPrefix: z.string(),
    RbacSystems: z.array(z.string()),
  }),
  AutomatedRmauAssignmentsForUnprotectedObjects: z.object({
    ApplyRmauAssignmentsForUnprotectedObjects: z.boolean(),
    ApplyToAccessTierLevel: z.array(z.string()),
    FilterObjectType: z.array(z.string()),
    RbacSystems: z.array(z.string()),
  }),
  CustomSecurityAttributes: z.object({
    PrivilegedUserAttribute: z.string(),
    PrivilegedUserPawAttribute: z.string(),
    PrivilegedServicePrincipalAttribute: z.string(),
    UserWorkAccountAttribute: z.string(),
  }),
});

export type EntraOpsConfig = z.infer<typeof EntraOpsConfigSchema>;
```

**TypeScript type in shared:** Add `EntraOpsConfig` to `gui/shared/types/api.ts` as a manual TypeScript type (matching the Zod schema shape), consistent with the existing pattern of TypeScript types in shared and Zod schemas in server routes. The client uses the shared TypeScript type for `useState`; the server uses the Zod schema to validate the PUT body.

### Pattern 3: View-only → Edit Mode Toggle

**What:** Form loads read-only; "Edit Settings" button creates a working draft; dirty state tracked; sticky header shows amber badge when dirty.

```typescript
// Sticky header pattern — matches shadcn settings page conventions
<div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between">
  <h1 className="text-lg font-semibold">Settings</h1>
  <div className="flex items-center gap-3">
    {isDirty && (
      <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs">
        Unsaved changes
      </Badge>
    )}
    {!isEditing ? (
      <Button size="sm" onClick={handleEditStart}>
        <Lock size={14} /> Edit Settings
      </Button>
    ) : (
      <>
        <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
        <Button size="sm" onClick={handlePreview} disabled={!isDirty}>
          Preview Changes
        </Button>
      </>
    )}
  </div>
</div>
```

### Pattern 4: Toggle-Controlled Sub-fields

**What:** A section has a root boolean toggle. When false, all sub-fields are visible but disabled/greyed.

**Follow pattern from `GlobalExclusionsTab.tsx`:** Pass `disabled` prop to inputs when parent toggle is false.

```typescript
// Example: LogAnalytics section
<Switch
  checked={draft.LogAnalytics.IngestToLogAnalytics}
  onCheckedChange={(val) =>
    setDraft(prev => ({ ...prev!, LogAnalytics: { ...prev!.LogAnalytics, IngestToLogAnalytics: val } }))
  }
  disabled={!isEditing}
/>
<Input
  value={draft.LogAnalytics.DataCollectionRuleName}
  disabled={!isEditing || !draft.LogAnalytics.IngestToLogAnalytics}
  onChange={(e) => /* nested update */}
  className={cn(!draft.LogAnalytics.IngestToLogAnalytics && 'opacity-50')}
/>
```

### Pattern 5: Inline Cron Picker — Five `<select>` Dropdowns

**What:** Five HTML `<select>` elements for minute / hour / dom / month / dow. No library. Derives a cron string and human-readable preview.

```typescript
const CRON_OPTIONS = {
  minute: [
    { value: '*', label: 'Every minute (*)' },
    { value: '0', label: '0' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' },
  ],
  hour: [
    { value: '*', label: 'Every hour (*)' },
    { value: '0', label: '0 (midnight)' },
    { value: '6', label: '6 (6am)' },
    { value: '9', label: '9 (9am)' },
    { value: '12', label: '12 (noon)' },
    { value: '18', label: '18 (6pm)' },
    // plus 1–23 for completeness
  ],
  dom: [
    { value: '*', label: 'Every day (*)' },
    { value: '1', label: '1st' },
    { value: '15', label: '15th' },
    { value: '28', label: '28th' },
  ],
  month: [
    { value: '*', label: 'Every month (*)' },
    { value: '1', label: 'Jan (1)' },
    { value: '3', label: 'Mar (3)' },
    { value: '6', label: 'Jun (6)' },
    { value: '12', label: 'Dec (12)' },
  ],
  dow: [
    { value: '*', label: 'Every day (*)' },
    { value: '0', label: 'Sunday (0)' },
    { value: '1', label: 'Monday (1)' },
    { value: '5', label: 'Friday (5)' },
    { value: '6', label: 'Saturday (6)' },
  ],
};

// Human-readable preview (pure function — no parser library needed)
function describeCron(cron: string): string {
  const [min, hour, dom, month, dow] = cron.split(' ');
  if ([min, hour, dom, month, dow].every(p => p === '*')) return 'Every minute';
  const parts: string[] = [];
  if (min !== '*') parts.push(`minute ${min}`);
  if (hour !== '*') parts.push(`hour ${hour}`);
  if (dow !== '*') parts.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Number(dow)] ?? `weekday ${dow}`);
  else if (dom !== '*') parts.push(`day ${dom}`);
  if (month !== '*') parts.push(`in month ${month}`);
  return parts.length ? parts.join(', ') : cron;
}
```

**The raw cron string** (e.g. `"30 9 * * *"`) is what gets written to the file, not the human-readable form.

### Pattern 6: Empty State — Live CLI Command Generator

**What:** When `GET /api/config` returns `{}`, render a mini-form that generates the correct PowerShell command as the user types.

**Pattern: controlled inputs → derived string (no useEffect)**

```typescript
// Purely derived — no state for the command string itself
const generatedCommand = useMemo(() => {
  let cmd = `New-EntraOpsConfigFile -TenantName "${tenantName}"`;
  if (showAdvanced) {
    if (authType !== 'FederatedCredentials') cmd += ` -AuthenticationType "${authType}"`;
    if (rbacSystems.length > 0) cmd += ` -RbacSystems @(${rbacSystems.map(s => `"${s}"`).join(',')})`;
    if (ingestToLogAnalytics) cmd += ` -IngestToLogAnalytics $true`;
    if (ingestToWatchLists) cmd += ` -IngestToWatchLists $true`;
  }
  return cmd;
}, [tenantName, showAdvanced, authType, rbacSystems, ingestToLogAnalytics, ingestToWatchLists]);
```

**Clipboard copy:**
```typescript
const [copied, setCopied] = useState(false);
async function handleCopy() {
  await navigator.clipboard.writeText(generatedCommand);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
```

**"Check again" re-fetch** — follow `useDashboard` pattern: increment a trigger counter.
```typescript
const [fetchTrigger, setFetchTrigger] = useState(0);
useEffect(() => {
  fetch('/api/config').then(/* ... */);
}, [fetchTrigger]);
// "Check again" button:
<Button onClick={() => setFetchTrigger(t => t + 1)}>Check Again</Button>
```

### Pattern 7: PUT /api/config — Atomic Write with Zod Validation

**What:** Extend existing `gui/server/routes/config.ts` with a PUT route.

```typescript
// gui/server/routes/config.ts — add PUT after existing GET
router.put('/', async (req, res, next) => {
  try {
    const result = EntraOpsConfigSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ error: result.error.issues });
      return;
    }
    const content = JSON.stringify(result.data, null, 2);
    await atomicWrite(CONFIG_PATH, content);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
```

**`atomicWrite` extraction:** Copy the `atomicWrite` function from `gui/server/routes/templates.ts` into `gui/server/routes/config.ts` directly (or extract to `gui/server/utils/atomicWrite.ts` for both to import). The extraction is cleaner but either works.

**`assertSafePath` is NOT needed for PUT /api/config.** CONFIG_PATH is hardcoded — it does not derive from user input. `assertSafePath` is for user-supplied file paths (e.g., template names). The Zod validation is the security gate for PUT.

**BOM handling on write:** `fs.writeFile(path, content, 'utf-8')` writes UTF-8 without BOM on Node.js. `parseBomJson()` already exists in config.ts to strip BOM on read. Round-trip is safe: read (strip BOM) → edit → write (no BOM). No special handling needed.

### Pattern 8: `\r` Stripping — Client-side at toHtml() Call Site

**What:** PowerShell on Windows emits `\r\n` line endings. These pass through SSE and arrive in `event.data` as `\r\n`. `ansi-to-html`'s `Convert.toHtml()` doesn't strip `\r`, so `whitespace-pre-wrap` renders the carriage return as a visible gap.

**Fix location:** Client-side, at every `converter.toHtml(event.data)` call site.

**ConnectPage.tsx** (two call sites):
```typescript
// Line ~216
const html = authConverterRef.current.toHtml(event.data.replace(/\r/g, ''));
// Line ~272
const html = classifyConverterRef.current.toHtml(event.data.replace(/\r/g, ''));
```

**RunCommandsPage.tsx** (one call site):
```typescript
// Line ~151
const html = converterRef.current.toHtml(event.data.replace(/\r/g, ''));
```

**Alternative:** Export a wrapper from `TerminalOutput.tsx`:
```typescript
export function convertAnsi(converter: InstanceType<typeof Convert>, raw: string): string {
  return converter.toHtml(raw.replace(/\r/g, ''));
}
```
Then replace all three call sites with `convertAnsi(converterRef.current, event.data)`. This is cleaner and keeps the fix in one place.

**CSS fix — `leading-relaxed` → `leading-normal`:** In `TerminalOutput.tsx` line ~73:
```typescript
// Before:
className="h-80 overflow-y-auto p-3 text-xs font-mono text-green-300 leading-relaxed whitespace-pre-wrap break-all"
// After:
className="h-80 overflow-y-auto p-3 text-xs font-mono text-green-300 leading-normal whitespace-pre-wrap break-all"
```
`leading-normal` = `line-height: 1.5` (vs `leading-relaxed` = 1.625). Single change in `TerminalOutput.tsx` affects both ConnectPage and RunCommandsPage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod `safeParse()` (already installed) | Error accumulation, type safety |
| Clipboard copy | execCommand('copy') | `navigator.clipboard.writeText()` | Modern API, no library |
| Deep copy of draft state | JSON.parse(JSON.stringify()) | `structuredClone()` | Built into V8/browsers, handles arrays/objects |
| Cron description | External parser library | Inline `describeCron()` pure function | 20 lines, no deps, no edge cases for supported fields |
| Diff preview | Custom diff renderer | `DiffDialog` (already built Phase 2) | Drop-in reuse |
| Atomic file write | Overwrite in place | `atomicWrite()` (copy from templates.ts) | Already tested |
| "Check again" re-fetch | Full page reload / React Router navigate | Increment trigger counter in useEffect dep | No state loss |

**Key insight:** Phase 6 deliberately reuses everything from Phases 2–5. New code is surface area, not depth.

---

## Common Pitfalls

### Pitfall 1: Assuming react-hook-form is available
**What goes wrong:** Importing `useForm`, `Controller`, `@hookform/resolvers/zod` — none of these are installed. TypeScript build fails.
**Why it happens:** react-hook-form is common in React tutorials; easy to assume it's present.
**How to avoid:** Use plain `useState` + `structuredClone`. Pre-save validation via local `safeParse()` call.
**Warning signs:** Any import containing `react-hook-form` or `@hookform`.

### Pitfall 2: Zod v4 custom error strings
**What goes wrong:** `z.string().min(1, { message: 'Required' })` — in Zod v4, the option is `error:` not `message:`.
**How to avoid:** `z.string().min(1, { error: 'Required' })` — or omit custom errors entirely for this phase.
**Source:** STATE.md: "Zod v4 schemas — use error: (not message:) for custom error strings" (verbatim from templates.ts line 26).

### Pitfall 3: Re-implementing already-fixed bugs
**What goes wrong:** The plan creates a task to "fix DiffDialog overflow" — but it's already fixed.
**Current state (verified from source):**
- `DiffDialog.tsx`: already has `className="overflow-auto max-h-[60vh] rounded border border-border"` on the content wrapper div.
- `TierAccordion.tsx`: already has `disabled={!dirtyActions[\`${tierIndex}-${entryIndex}\`]}` on the Preview Changes Button. Shadcn Button base already applies `disabled:pointer-events-none disabled:opacity-50`.
- `cursor-not-allowed`: NOT in TierAccordion. Shadcn Button uses `pointer-events-none` on disabled, which hides the cursor. Add `disabled:cursor-not-allowed` to the Button's `className` if you want the not-allowed cursor to show — but note that `pointer-events-none` prevents the cursor from rendering at all on the button itself. The CONTEXT.md workaround: remove `pointer-events-none` override or add `cursor-not-allowed` via `[&:disabled]` — but actually with shadcn's `pointer-events-none` the cursor won't show regardless. **Verified:** the visual feedback is already achieved via `opacity-50`. `cursor-not-allowed` is cosmetically irrelevant when `pointer-events-none` is applied.
**Plan task:** Single "verify deferred bugs" task that checks current state and confirms done or applies remaining delta (only the `cursor-not-allowed` question and visual check).

### Pitfall 4: Using `JSON.stringify` comparison with key-order differences
**What goes wrong:** `isDirty` false-positives if disk config and draft have keys in different order.
**Why it happens:** `JSON.stringify` is order-sensitive; PowerShell's `[ordered]@{}` preserves order, but if a PUT roundtrip rewrites the file, key order may shift.
**How to avoid:** Sort keys before comparing, OR compare the initial draft (loaded from GET) against the current draft — since both start from the same parse, order is preserved. `JSON.stringify(draft) !== JSON.stringify(diskConfig)` is safe if `draft` is created by `structuredClone(diskConfig)` from the same parsed object (same in-memory order).

### Pitfall 5: Missing Settings route in App.tsx
**What goes wrong:** Sidebar links to `/settings` but no `<Route path="settings">` exists in `App.tsx`.
**How to avoid:** Add `<Route path="settings" element={<SettingsPage />} />` alongside the Settings nav entry.

### Pitfall 6: Sidebar nav order discrepancy
**What goes wrong:** CONTEXT.md specifies order "Dashboard | Objects | Templates | Commands | Connect | History | Settings" but current `Sidebar.tsx` NAV_ITEMS is `[Dashboard, Browse Objects, Templates, History, Run Commands, Connect]`. History and Run Commands are swapped relative to spec; audit required.
**Current NAV_ITEMS order:** Dashboard (/) | Browse Objects (/objects) | Templates (/templates) | History (/history) | Run Commands (/run) | Connect (/connect)
**Required final order:** Dashboard | Objects | Templates | Commands | Connect | History | Settings
**Delta:** Move History after Connect; add Settings after History.

### Pitfall 7: Switch vs Checkbox for boolean toggles
**What goes wrong:** Using a bare `<input type="checkbox">` instead of shadcn `Switch` for boolean config fields. Visually inconsistent.
**How to avoid:** Use shadcn `Switch` component for all boolean true/false fields in the config. Wire `checked` and `onCheckedChange` props.

### Pitfall 8: `structuredClone` on arrays containing mixed types
**What goes wrong:** `EntraOpsConfig.RbacSystems` is `string[]` in TypeScript but the actual disk JSON may serialise PowerShell arrays as `[string]` on single items. Verify JSON parse produces `string[]` not `string` before building form state.
**How to avoid:** The Zod schema with `z.array(RbacSystemEnum)` will catch this at PUT validation. Client-side: initialise RbacSystems as `Array.isArray(val) ? val : [val]` when hydrating form state from disk.

---

## Code Examples

### Read-only field with Lock icon and Tooltip

```typescript
// Source: shadcn/ui Tooltip pattern + lucide-react Lock icon
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

// Inside SettingsPage section card:
<div className="flex items-center gap-2">
  <p className="text-sm text-muted-foreground font-mono">{diskConfig.TenantId}</p>
  <Tooltip>
    <TooltipTrigger asChild>
      <Lock size={14} className="text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent>
      <p>Set by New-EntraOpsConfigFile — edit in PowerShell</p>
    </TooltipContent>
  </Tooltip>
</div>
```

### Section card structure

```typescript
// Follow Dashboard KPI card pattern
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-semibold">Identity & Auth</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* fields */}
  </CardContent>
</Card>
```

### Nested field update helper

```typescript
// Deep-merge one section of draft — avoids spread hell
function updateSection<K extends keyof EntraOpsConfig>(
  section: K,
  changes: Partial<EntraOpsConfig[K]>
) {
  setDraft(prev =>
    prev ? { ...prev, [section]: { ...prev[section], ...changes } } : prev
  );
}
// Usage:
updateSection('LogAnalytics', { IngestToLogAnalytics: true });
```

### PUT /api/config call from client

```typescript
async function handleConfirmSave() {
  setSaving(true);
  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const err = await res.json() as { error?: unknown };
        errMsg = JSON.stringify(err.error ?? err);
      } catch { /* non-JSON error body */ }
      setError(errMsg);
      return;
    }
    setDiskConfig(draft!); // disk now matches draft
    setIsEditing(false);
    setSavedAt(Date.now());
    setDiffOpen(false);
  } finally {
    setSaving(false);
  }
}
```

### Empty state code block with copy button

```typescript
<div className="relative rounded-md bg-muted border border-border p-4">
  <pre className="text-sm font-mono text-foreground whitespace-pre-wrap pr-8">
    {generatedCommand}
  </pre>
  <Button
    size="icon-sm"
    variant="ghost"
    className="absolute top-2 right-2"
    onClick={handleCopy}
    aria-label="Copy to clipboard"
  >
    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
  </Button>
</div>
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is code/config changes only; all libraries already installed).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `gui/client/vite.config.ts` (inline `test:` block) |
| Quick run command | `cd gui/client && npm test -- --run` |
| Full suite command | `cd gui/server && npm test && cd ../client && npm test -- --run` |
| TypeScript build check | `cd gui/client && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SETT-01 | Settings page renders section cards from config data | unit (RTL) | `cd gui/client && npm test -- --run src/pages/SettingsPage.test.tsx` | ❌ Wave 0 |
| SETT-01 | Settings page renders read-only mode by default | unit (RTL) | same file | ❌ Wave 0 |
| SETT-02 | PUT `/api/config` with valid body returns 200 and writes file | integration (supertest) | `cd gui/server && npm test` | ❌ Wave 0 |
| SETT-02 | PUT `/api/config` with invalid body returns 422 | integration (supertest) | `cd gui/server && npm test` | ❌ Wave 0 |
| SETT-03 | Settings page renders empty state when config is `{}` | unit (RTL) | `cd gui/client && npm test -- --run src/pages/SettingsPage.test.tsx` | ❌ Wave 0 |
| SETT-03 | `describeCron()` returns correct human-readable string for common patterns | unit | `cd gui/client && npm test -- --run src/lib/cron.test.ts` | ❌ Wave 0 |
| Polish | `\r` is stripped before `ansi-to-html` conversion | unit | `cd gui/client && npm test -- --run src/components/commands/TerminalOutput.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd gui/server && npm test` (server tests only — fast)
- **Per wave merge:** `cd gui/server && npm test && cd ../client && npm test -- --run`
- **Phase gate:** TypeScript build green + full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `gui/server/src/__tests__/config.test.ts` — covers SETT-02 PUT validation and atomic write (follow `templates.test.ts` pattern exactly: `vi.mock('node:fs/promises')`, `supertest`, `buildApp()` helper)
- [ ] `gui/client/src/pages/SettingsPage.test.tsx` — covers SETT-01 read-only render, SETT-03 empty state render
- [ ] `gui/client/src/lib/cron.test.ts` — unit tests for `describeCron()` pure function (import the util directly)
- [ ] `gui/client/src/components/commands/TerminalOutput.test.tsx` — tests for `\r` stripping helper

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| react-hook-form for all forms | Plain `useState` with `structuredClone` | This codebase uses useState — consistent |
| `JSON.parse(JSON.stringify(obj))` for deep copy | `structuredClone(obj)` | V8 built-in; available Node 17+, all modern browsers |
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | Modern API; works on localhost without HTTPS |
| Zod v3 `message:` for custom errors | Zod v4 `error:` | Breaking change — already noted in STATE.md |

---

## Open Questions

1. **`CustomSecurityAttributes` section — editable or read-only?**
   - What we know: The PowerShell schema includes this section with four string fields. The CONTEXT.md section breakdown (4 sections: Identity & Auth, Automation, Integrations, AD Management) does not include `CustomSecurityAttributes` explicitly.
   - What's unclear: Should this section be included in the form? It doesn't have a boolean enable toggle, so the toggle-controlled sub-fields pattern doesn't apply.
   - Recommendation: Include it as a fifth section "Security Attributes" with plain text inputs — simple string fields with no special logic.

2. **`UpdateScheduledCron` field — does it also need the 5-field cron picker?**
   - The CONTEXT.md calls out `WorkflowTrigger.PullScheduledCron` and `WorkflowTrigger.UpdateScheduledCron` for the cron picker. But `UpdateScheduledCron` lives inside `AutomatedEntraOpsUpdate`, not `WorkflowTrigger`.
   - Recommendation: Apply the cron picker to both cron fields regardless of section: `WorkflowTrigger.PullScheduledCron` and `AutomatedEntraOpsUpdate.UpdateScheduledCron`.

3. **TierAccordion cursor-not-allowed — cosmetically irrelevant?**
   - What we know: Shadcn Button base class includes `disabled:pointer-events-none`, which prevents the browser from rendering the `cursor-not-allowed` style on the button element.
   - What's unclear: Whether adding `cursor-not-allowed` alongside `pointer-events-none` achieves the cursor effect.
   - Recommendation: From CSS perspective, `cursor-not-allowed` on the button is swallowed by `pointer-events-none`. The `opacity-50` already provides sufficient visual feedback. This Polish task is done (disabled state already implemented). A plan task should just verify in-browser.

---

## Sources

### Primary (HIGH confidence — direct source code inspection)

- `gui/client/package.json` — confirmed react-hook-form NOT installed; zod ^4.3.6 installed
- `gui/client/src/components/templates/DiffDialog.tsx` — confirmed overflow fix already applied (`overflow-auto max-h-[60vh]`)
- `gui/client/src/components/templates/TierAccordion.tsx` — confirmed `disabled={!dirtyActions[...]}` already applied
- `gui/client/src/components/commands/TerminalOutput.tsx` — confirmed `leading-relaxed` is unfixed
- `gui/client/src/components/layout/Sidebar.tsx` — confirmed nav order, Settings entry missing
- `gui/client/src/App.tsx` — confirmed `/settings` route missing
- `gui/server/routes/templates.ts` — `atomicWrite()` implementation source (copy or extract)
- `gui/server/routes/config.ts` — `parseBomJson()` + `CONFIG_PATH` pattern established
- `gui/server/middleware/security.ts` — `assertSafePath()` confirmed NOT needed for static path PUT
- `EntraOps/Public/Configuration/New-EntraOpsConfigFile.ps1` — complete config schema derived from `$EnvConfigSchema` ordered hashtable (lines ~120–190)
- `.planning/config.json` — `nyquist_validation: true` confirmed
- `gui/server/src/__tests__/templates.test.ts` — server test pattern (supertest + vi.mock + buildApp)
- `gui/client/vite.config.ts` — vitest in-config setup (`globals: true`, `jsdom`, `setupFiles`, `src/**/*.{test,spec}.{ts,tsx}`)

### Secondary (MEDIUM confidence — MDN / well-known browser APIs)

- `navigator.clipboard.writeText()` — standard Web API; works on localhost (treated as secure context)
- `structuredClone()` — V8 built-in since Node 17; browser support 2022+

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json
- Form architecture (no react-hook-form): HIGH — confirmed absence from package.json
- Already-fixed bugs: HIGH — verified from source files directly
- Zod v4 schema: HIGH — derived from PowerShell source; Zod API confirmed from STATE.md and existing code
- Architecture patterns: HIGH — all patterns derived from existing codebase files
- Test patterns: HIGH — derived from existing server tests

**Research date:** 2026-03-26
**Valid until:** This research is codebase-state-derived; valid until files change. External library research is unnecessary — all dependencies are already installed.
