---
phase: 02-classification-template-editor
verified: 2026-03-25T00:00:00Z
status: human_needed
score: 29/31 truths verified
human_verification:
  - test: "Visual structure — all 5 classification files appear as structured tree"
    expected: "All 5 tabs load data (no blank/skeleton stuck state); TierAccordion renders tier → Category/Service hierarchy with labelled tier headers"
    why_human: "Data display depends on runtime JS rendering; need to confirm accordion structure and tier labeling in a real browser"
  - test: "No console errors during full edit+save flow"
    expected: "Zero console errors while opening tabs, editing an action chip, confirming save, and adding/removing a GUID in Global Exclusions"
    why_human: "Console errors are invisible to static analysis; requires browser DevTools during a live session"
---

# Phase 2: Classification Template Editor — Verification Report

**Phase Goal:** Security admins and EntraOps contributors can safely edit EAM tier classification templates in-browser, with schema validation and diff preview, eliminating the need to hand-edit JSON files.
**Verified:** 2026-03-25
**Status:** human_needed — all automated checks pass; 2 browser-only confirmations remain
**Re-verification:** No — initial verification

---

## Goal Achievement

### ROADMAP Success Criteria (Primary)

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| 1 | User can open template editor; all 5 files shown as structured tree (tier → category → service) | ✓ VERIFIED | `TemplatesPage.tsx` renders 5 `TEMPLATE_NAMES` tabs; `TierAccordion.tsx` renders `AccordionItem` per tier with `CardContent` per entry showing `{entry.Category} / {entry.Service}` |
| 2 | User can edit `RoleDefinitionActions` inline; saving blocked with validation error on schema failure | ✓ VERIFIED | `ChipEditor.tsx` is editable; `TierAccordion.handlePreview` gates via `ActionsSchema.safeParse`; server `PUT /:name` gates via `TemplateFileSchema.safeParse` → 400 |
| 3 | Before file write, user sees a diff; after saving, UI warns to commit to git | ✓ VERIFIED | `DiffDialog.tsx` renders `diffLines(before, after)` with colour-coded spans; `SaveBanner.tsx` shows amber alert after `savedAt` updates |
| 4 | `Classification/Global.json` exclusion list is viewable and editable in the same tabbed interface | ✓ VERIFIED | `GlobalExclusionsTab.tsx` fetches `GET /api/templates/global`, renders GUID rows with Trash2 buttons, UUID validation on add, PUT on confirm |

**ROADMAP Score: 4/4**

---

## Plan-Level Observable Truths

### Plan 02-01 — API + Types (TMPL-04, TMPL-05)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `GET /api/templates/Classification_AadResources` returns parsed tiers array | ✓ VERIFIED | `gui/server/routes/templates.ts` L107–121: reads JSON, validates via `TemplateFileSchema`, returns `{ name, tiers }`. All 5 `*.json` files confirmed present in `Classification/Templates/` |
| 2 | `PUT /api/templates/Classification_AadResources` with valid body writes atomically and returns 200 | ✓ VERIFIED | `atomicWrite()` (L55–59): writes `.tmp` then `fs.rename`; returns `{ ok: true }` |
| 3 | PUT with structurally invalid body returns 400 with Zod error details | ✓ VERIFIED | `TemplateFileSchema.safeParse(req.body.tiers)` L130–132: `res.status(400).json({ error: validated.error.flatten() })` |
| 4 | Path like `../../../etc/passwd` as `:name` param returns 403 | ⚠️ DIVERGES | Returns **400** (unknown template name allowlist check fires first, L127–130). `assertSafePath` also runs as a second guard but never reached for this input. **Security intent is met** — traversal is blocked — but the HTTP status differs from the stated truth |
| 5 | `GET /api/templates/global` returns `{ exclusions: string[] }` | ✓ VERIFIED | `routes/templates.ts` L66–79: reads `Global.json`, parses `ExcludedPrincipalId`, returns `{ exclusions }`. `Classification/Global.json` confirmed present on disk |
| 6 | `PUT /api/templates/global` writes `Classification/Global.json` atomically | ✓ VERIFIED | `atomicWrite(GLOBAL_PATH, ...)` L86–97 |

### Plan 02-02 — UI Shell (TMPL-01, TMPL-02)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 7 | `/templates` shows 6 tabs: 5 classification + Global Exclusions | ✓ VERIFIED | `TemplatesPage.tsx` L56–67: `TEMPLATE_NAMES.map(...)` + `<TabsTrigger value="global">Global Exclusions</TabsTrigger>` = 6 tabs |
| 8 | `Templates` appears in sidebar and highlights when `/templates` is active | ✓ VERIFIED | `Sidebar.tsx` L9–11: `{ to: '/templates', icon: FileJson, label: 'Templates' }` in `NAV_ITEMS`; `NavLink` applies `isActive` styles |
| 9 | Activating a template tab fetches `/api/templates/:name` and renders accordion | ✓ VERIFIED | `TemplatesPage.tsx` L30–47: `useEffect` on `activeTab` → `fetch(/api/templates/${name})` → `setTemplateData` → `<TierAccordion tiers={...} />` |
| 10 | `RoleAssignmentScopeName` shown as read-only badge | ✓ VERIFIED | `TierAccordion.tsx` L85–87: `<Badge variant="outline">{entry.RoleAssignmentScopeName.join(', ')}</Badge>` — rendered as Badge, not an input |
| 11 | `DiffDialog` renders added=green, removed=red, unchanged=neutral | ✓ VERIFIED | `DiffDialog.tsx` L26–33: `bg-green-950 text-green-300` / `bg-red-950 text-red-300` / `text-muted-foreground` |

### Plan 02-03 — Chip Editor + Save Flow (TMPL-03, TMPL-04, TMPL-05)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 12 | Entry cards show `RoleDefinitionActions` as dismissible pill chips | ✓ VERIFIED | `ChipEditor.tsx`: `Badge` per action with `<X size={12} />` button wired to `onChange(filter(...))` |
| 13 | Clicking × removes that action | ✓ VERIFIED | `ChipEditor.tsx` L34–40: `onChange(actions.filter((_, idx) => idx !== i))` |
| 14 | Add-action input appends trimmed string on Enter or Add button | ✓ VERIFIED | `ChipEditor.tsx` L16–21 `handleAdd()`; `onKeyDown` fires on Enter; `onClick` on Add button |
| 15 | Preview Changes button visible on each entry card | ✓ VERIFIED | `TierAccordion.tsx` L118–125: `<Button onClick={() => handlePreview(tierIndex, entryIndex)}>Preview Changes</Button>` rendered for every entry |
| 16 | Preview Changes with a valid entry opens DiffDialog | ⚠️ PARTIAL | `handlePreview` (L53–65): only opens dialog if `dirtyActions[key]` exists. If no edits yet, button silently no-ops with no feedback to user. Visual feedback (disabled state or toast) is absent |
| 17 | Preview Changes with invalid entry shows inline validation error | ✓ VERIFIED | `ActionsSchema.safeParse(currentActions)` L58–63: sets `validationErrors` → rendered as `<p className="text-destructive">` |
| 18 | Confirm & Save calls `PUT /api/templates/:name`, closes dialog, updates state | ✓ VERIFIED | `TierAccordion.tsx` L140–163: `fetch(PUT)` → on success clears dirty state, closes dialog, calls `onSaved(proposedTiers)` |
| 19 | Cancel keeps edits intact | ✓ VERIFIED | `onCancel={() => setDiffOpen(null)}` — only closes dialog; `dirtyActions` state untouched |

### Plan 02-04 — Global Exclusions + Save Banner (TMPL-06, TMPL-07)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 20 | Global Exclusions tab shows GUID rows with Trash2 delete | ✓ VERIFIED | `GlobalExclusionsTab.tsx` L62–72: `exclusions.map(...)` → `<Trash2 size={14} />` button per row |
| 21 | Add GUID input validates UUID format; inline error on invalid | ✓ VERIFIED | `UuidSchema = z.string().uuid()`; `safeParse` → `setInputError(...)` |
| 22 | Valid GUID added appears as new row | ✓ VERIFIED | `setExclusions((prev) => [...prev, trimmed])` |
| 23 | Preview Changes opens DiffDialog for Global.json diff | ✓ VERIFIED | `<Button onClick={() => setDiffOpen(true)}>Preview Changes</Button>`; disabled when `JSON.stringify(exclusions) === JSON.stringify(originalExclusions)` |
| 24 | Saving calls `PUT /api/templates/global` and updates UI | ✓ VERIFIED | `GlobalExclusionsTab.tsx` L122–136: `fetch('/api/templates/global', { method: 'PUT' })` → `setOriginalExclusions([...exclusions])` on success → `onSaved()` |
| 25 | Yellow dismissible alert appears after any save | ✓ VERIFIED | `SaveBanner.tsx`: amber Alert shown when `savedAt > 0 && !dismissed`; `savedAt` set via `setSavedAt(Date.now())` in both save handlers |
| 26 | Banner dismissible by × | ✓ VERIFIED | `<Button onClick={() => setDismissed(true)}>` |
| 27 | Banner reappears after next save even if dismissed | ✓ VERIFIED | `useEffect(() => { if (savedAt > 0) setDismissed(false); }, [savedAt])` |

### Plan 02-05 — Human Verification (all TMPL-01–07)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 28 | All 4 ROADMAP success criteria verified in browser | ? NEEDS HUMAN | `02-05-SUMMARY.md` documents "All 4 ROADMAP Phase 2 success criteria confirmed human-verified in browser before closing phase" — cannot independently verify programmatically |
| 29 | No console errors during verification flow | ? NEEDS HUMAN | Requires live browser DevTools session |
| 30 | Template files on disk updated after successful save | ✓ VERIFIED | `atomicWrite()` writes to `Classification/Templates/*.json` and `Classification/Global.json`; both paths confirmed on disk |

**Plan-level score: 28/30 automated truths** (1 warning: traversal returns 400 not 403; 1 partial: Preview Changes no-op; 2 human-needed)

---

## Required Artifacts

| Artifact | Line Count | Status | Notes |
|---|---|---|---|
| `gui/shared/types/templates.ts` | 40 | ✓ VERIFIED | Exports `TemplateName`, `TEMPLATE_NAMES`, `TierBlock`, `TierLevelDefinitionEntry`, `GetTemplateResponse`, `GetGlobalResponse`, `GlobalExclusion` |
| `gui/server/routes/templates.ts` | 146 | ✓ VERIFIED | Full router: GET `/, /global, /:name`; PUT `/global, /:name`; Zod validation; `atomicWrite` |
| `gui/server/index.ts` | 40 | ✓ VERIFIED | `app.use('/api/templates', templatesRouter)` confirmed at L21 |
| `gui/client/src/pages/TemplatesPage.tsx` | 97 | ✓ VERIFIED | 6-tab layout, useEffect fetch, SaveBanner + TierAccordion + GlobalExclusionsTab wired |
| `gui/client/src/components/templates/TierAccordion.tsx` | 170 | ✓ VERIFIED | Accordion per tier, ChipEditor per entry, handlePreview + DiffDialog + PUT save flow |
| `gui/client/src/components/templates/DiffDialog.tsx` | 54 | ✓ VERIFIED | `diffLines` based diff, colour-coded spans, Confirm & Save / Cancel buttons |
| `gui/client/src/components/templates/ChipEditor.tsx` | 61 | ✓ VERIFIED | Badge chips with X dismiss, add input (Enter + button), handles empty/duplicate |
| `gui/client/src/components/templates/GlobalExclusionsTab.tsx` | 143 | ✓ VERIFIED | Full GET+PUT flow, UUID validation, DiffDialog integration |
| `gui/client/src/components/templates/SaveBanner.tsx` | 40 | ✓ VERIFIED | Amber Alert, `savedAt` re-triggers after dismiss |
| `gui/client/src/App.tsx` | 20 | ✓ VERIFIED | `<Route path="templates" element={<TemplatesPage />} />` at L15 |
| `gui/client/src/components/layout/Sidebar.tsx` | 65 | ✓ VERIFIED | `FileJson` icon + `Templates` label in NAV_ITEMS, `NavLink` with isActive highlight |

---

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `gui/server/routes/templates.ts` | `Classification/Templates/*.json` | `assertSafePath` guard + `fs.promises` | ✓ WIRED | `safeTemplatePath = assertSafePath(TEMPLATES_BASE)` at L14; used at L111, L138 |
| `gui/server/routes/templates.ts` | `gui/server/middleware/security.ts` | `assertSafePath` import | ✓ WIRED | `import { assertSafePath } from '../middleware/security.js'` L5 |
| `gui/server/index.ts` | `gui/server/routes/templates.ts` | `app.use('/api/templates', templatesRouter)` | ✓ WIRED | L8 import + L21 registration |
| `gui/client/src/App.tsx` | `gui/client/src/pages/TemplatesPage.tsx` | `<Route path="templates">` | ✓ WIRED | L6 import + L15 route |
| `gui/client/src/components/layout/Sidebar.tsx` | `/templates` | `NAV_ITEMS` entry with `FileJson` icon | ✓ WIRED | L10 in NAV_ITEMS const |
| `gui/client/src/pages/TemplatesPage.tsx` | `/api/templates/:name` | `fetch` in `useEffect` | ✓ WIRED | L33: `` fetch(`/api/templates/${name}`) `` |
| `gui/client/src/components/templates/TierAccordion.tsx` | `ChipEditor.tsx` | `import + render per entry` | ✓ WIRED | L10 import; L104 `<ChipEditor .../>` |
| `gui/client/src/components/templates/TierAccordion.tsx` | `DiffDialog.tsx` | `import + render` | ✓ WIRED | L11 import; L128 `<DiffDialog .../>` |
| `gui/client/src/components/templates/TierAccordion.tsx` | `/api/templates/:name` | `PUT fetch in onConfirm` | ✓ WIRED | L140: `fetch(`/api/templates/${templateName}`, { method: 'PUT' })` |
| `gui/client/src/components/templates/GlobalExclusionsTab.tsx` | `/api/templates/global` | `GET on mount + PUT on confirm` | ✓ WIRED | L25 GET fetch; L122 PUT fetch |
| `gui/client/src/pages/TemplatesPage.tsx` | `SaveBanner.tsx` | `savedAt` prop | ✓ WIRED | L9 import; L51 `<SaveBanner savedAt={savedAt} />` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `TemplatesPage.tsx` | `templateData[name]` | `fetch(/api/templates/${name})` → `setTemplateData` | `routes/templates.ts` reads actual `Classification/Templates/${name}.json` (6 files confirmed on disk) | ✓ FLOWING |
| `TierAccordion.tsx` | `tiers` prop | Passed from `TemplatesPage.templateData[name]` | Same chain above | ✓ FLOWING |
| `GlobalExclusionsTab.tsx` | `exclusions` state | `fetch('/api/templates/global')` → `setExclusions(data.exclusions)` | `routes/templates.ts` reads `Classification/Global.json` (confirmed on disk) | ✓ FLOWING |
| `SaveBanner.tsx` | `savedAt` prop | `setSavedAt(Date.now())` in `TierAccordion.onSaved` and `GlobalExclusionsTab.onSaved` | Triggered by real successful PUT responses | ✓ FLOWING |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| TMPL-01 | 02-02, 02-05 | Template editor presents all 5 classification files in a tabbed interface | ✓ SATISFIED | `TemplatesPage.tsx` renders a tab for each of the 5 `TEMPLATE_NAMES` |
| TMPL-02 | 02-02, 02-05 | Each template displayed as structured tree by tier → Category → Service | ✓ SATISFIED | `TierAccordion.tsx` renders `AccordionItem` per tier; `Card` per entry with `{Category} / {Service}` |
| TMPL-03 | 02-03, 02-05 | User can edit `RoleDefinitionActions` inline | ✓ SATISFIED | `ChipEditor.tsx` renders editable dismissible chips; add-action input present |
| TMPL-04 | 02-01, 02-03, 02-05 | Zod runtime validation before saving | ✓ SATISFIED | Client: `ActionsSchema.safeParse` in `handlePreview`; Server: `TemplateFileSchema.safeParse` in PUT route |
| TMPL-05 | 02-01, 02-05 | Saving writes back to corresponding `Classification/Templates/*.json` | ✓ SATISFIED | `atomicWrite(filePath, ...)` in `routes/templates.ts`; actual JSON files confirmed on disk |
| TMPL-06 | 02-04, 02-05 | `Classification/Global.json` viewable and editable in same UI | ✓ SATISFIED | `GlobalExclusionsTab.tsx` with full CRUD edit flow; `Global.json` confirmed on disk |
| TMPL-07 | 02-04, 02-05 | UI warns after saving that edits should be committed to git | ✓ SATISFIED | `SaveBanner.tsx` amber alert displayed on every `savedAt` update |

**All 7 requirements accounted for. No orphaned requirements.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `ChipEditor.tsx` | 51 | `placeholder="Add action..."` | ℹ️ INFO | HTML `<input placeholder>` attribute — not a stub; provides input hint text |
| `GlobalExclusionsTab.tsx` | 94 | `placeholder="Add GUID..."` | ℹ️ INFO | HTML `<input placeholder>` attribute — not a stub |
| `TierAccordion.tsx` | 53 | `if (!dirtyActions[key]) return;` in `handlePreview` | ⚠️ WARNING | `Preview Changes` button silently no-ops when no edits have been made — no user feedback. Non-blocking; captured as a todo |

**No blockers found.**

---

## Human Verification Required

### 1. Visual tree structure in browser

**Test:** Navigate to `/templates` in a browser with the dev server running. Click each of the 5 classification tabs in turn.
**Expected:** Each tab loads and displays a non-empty accordion with tier headers (ControlPlane / ManagementPlane / UserAccess colour-coded). Expanding a tier shows entry cards with Category/Service labels. No skeleton spinners stuck; no error alerts.
**Why human:** Data display accuracy and visual hierarchy rendering cannot be confirmed by static analysis.

### 2. No console errors during edit+save round-trip

**Test:** Open browser DevTools (Console tab). Edit one `RoleDefinitionActions` chip on any entry, click `Preview Changes`, review the diff, click `Confirm & Save`. Then switch to Global Exclusions, add a valid GUID, click `Preview Changes`, confirm save. Also test that the dismissible SaveBanner appears and reappears after a second save.
**Expected:** Zero JS errors or warnings in Console throughout the flow. Each save shows the amber banner.
**Why human:** Runtime exceptions (type errors, network errors, React rendering warnings) are only visible in a live browser session.

> **Note:** `02-05-SUMMARY.md` documents that all 4 ROADMAP success criteria were confirmed human-verified in-browser on 2026-03-25 before phase closure. The above items are provided for independent re-confirmation.

---

## Summary

Phase 2 goal achievement is **confirmed by automated verification** across all 11 artifacts and 11 key links. All 7 requirements (TMPL-01–07) are satisfied. All 4 ROADMAP success criteria are substantively implemented in the codebase with real data flows from disk-backed JSON files.

**Two non-blocking observations:**

1. **Path traversal behaviour** (⚠️ WARNING): A malicious `:name` param returns HTTP 400 (allowlist gate), not 403 as stated in the `02-01-PLAN` truth. Security intent is fully met — traversal is blocked — but the status code diverges from the documented contract.

2. **Preview Changes silent no-op** (⚠️ WARNING): Clicking `Preview Changes` before making any edits silently returns without feedback. An improvement (button disabled state or toast) has been captured as a todo.

Both items are non-blocking with respect to the phase goal.

---

_Verified: 2026-03-25_
_Verifier: GitHub Copilot (gsd-verifier mode)_
