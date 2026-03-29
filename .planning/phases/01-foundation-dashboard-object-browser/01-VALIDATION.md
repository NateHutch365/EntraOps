---
phase: 01
slug: foundation-dashboard-object-browser
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `gui/client/vite.config.ts` (vitest config embedded under `test:` key) |
| **Quick run command** | `cd gui && npm test -w client -- --run` |
| **Full suite command** | `cd gui && npm test -w client -- --run --reporter=verbose` |
| **Server tests command** | `cd gui && npm test -w server -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd gui && npm test -w client -- --run`
- **After every plan wave:** Run `cd gui && npm test -w client -- --run --reporter=verbose && npm test -w server -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01, FOUND-02 | smoke | `ls gui/package.json gui/client/package.json gui/server/package.json gui/shared/package.json` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | FOUND-07 | type | `cd gui && npx tsc -p tsconfig.json --noEmit 2>&1` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | FOUND-06 | smoke | `grep 'tailwindcss()' gui/client/vite.config.ts && grep '127.0.0.1:3001' gui/client/vite.config.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | FOUND-04 | unit | `cd gui && npm test -w server -- --run src/__tests__/security.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | FOUND-04 | unit | `cd gui && npm test -w server -- --run src/__tests__/security.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | FOUND-08 | unit | `cd gui && npm test -w server -- --run src/__tests__/eamReader.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | FOUND-03 | smoke | `grep '@theme inline' gui/client/src/globals.css && grep 'fluent-accent' gui/client/src/globals.css && grep 'tier-control' gui/client/src/globals.css` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | FOUND-05 | smoke | `grep 'Sidebar' gui/client/src/components/layout/AppShell.tsx && grep '56px' gui/client/src/components/layout/Sidebar.tsx` | ❌ W0 | ⬜ pending |
| 01-03-03 | 03 | 2 | FOUND-05, FOUND-06 | smoke | `grep 'NuqsAdapter' gui/client/src/main.tsx && grep 'react-router/v7' gui/client/src/main.tsx` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | DASH-01..07 | smoke | `grep 'tiers' gui/server/routes/dashboard.ts && grep 'hasData' gui/server/routes/dashboard.ts` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 2 | DASH-05 | smoke | `grep 'getRecentPrivilegedEAMCommits' gui/server/routes/git.ts` | ❌ W0 | ⬜ pending |
| 01-04-03 | 04 | 2 | OBJ-01..03 | smoke | `grep 'QuerySchema.safeParse' gui/server/routes/objects.ts && grep 'manualPagination' gui/server/routes/objects.ts 2>/dev/null || grep 'pageSize' gui/server/routes/objects.ts` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 3 | DASH-01..04 | smoke | `ls gui/client/src/components/dashboard/KPICard.tsx gui/client/src/hooks/useDashboard.ts` | ❌ W0 | ⬜ pending |
| 01-05-02 | 05 | 3 | DASH-01..07 | smoke | `grep 'hasData' gui/client/src/pages/Dashboard.tsx && grep 'ChartContainer' gui/client/src/components/dashboard/TierBarChart.tsx && grep 'h-\[200px\]' gui/client/src/components/dashboard/TierBarChart.tsx` | ❌ W0 | ⬜ pending |
| 01-06-01 | 06 | 3 | OBJ-02..04 | smoke | `grep 'parseAsNativeArrayOf' gui/client/src/pages/ObjectBrowser.tsx && grep 'parseAsIndex' gui/client/src/pages/ObjectBrowser.tsx` | ❌ W0 | ⬜ pending |
| 01-06-02 | 06 | 3 | OBJ-01 | smoke | `grep 'manualPagination.*true' gui/client/src/components/objects/ObjectTable.tsx && grep -v 'getSortedRowModel' gui/client/src/components/objects/ObjectTable.tsx` | ❌ W0 | ⬜ pending |
| 01-07-01 | 07 | 4 | OBJ-05, OBJ-06 | smoke | `grep 'side="right"' gui/client/src/components/objects/ObjectDetailPanel.tsx && grep 'Collapsible' gui/client/src/components/objects/RoleAssignmentRow.tsx` | ❌ W0 | ⬜ pending |
| 01-07-02 | 07 | 4 | OBJ-07 | smoke | `grep 'objectId' gui/client/src/pages/ObjectDetail.tsx && grep 'useParams' gui/client/src/pages/ObjectDetail.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `gui/server/src/__tests__/security.test.ts` — stubs for FOUND-04:
  - `assertSafePath` returns resolved path for valid input
  - `assertSafePath` throws (status 403) for `../../` traversal attempt
  - `securityMiddleware` calls next() for localhost; returns 400 for foreign host header
- [ ] `gui/server/src/__tests__/eamReader.test.ts` — stubs for FOUND-08:
  - `readEamJson` strips UTF-8 BOM (`\uFEFF`) before `JSON.parse`
  - `readEamJson` returns cached result if mtime unchanged within TTL
- [ ] vitest config in `gui/client/vite.config.ts` under `test:` key (environment: 'jsdom', globals: true)
- [ ] vitest config in `gui/server/vitest.config.ts` (environment: 'node')

*Wave 0 tasks are embedded in Plan 01 (vitest config) and Plan 02 (test stubs, tdd="true").*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run dev` starts both servers simultaneously | FOUND-02 | Requires visual terminal output + browser load | Run `cd gui && npm run dev`; confirm both "vite" and "EntraOps GUI server" appear in output; open http://localhost:5173 |
| Sidebar collapses to icon-only on toggle | FOUND-05 | Visual state check | Click sidebar toggle button; confirm labels disappear and only icons remain at 56px width |
| Filter selection updates URL immediately (no Apply button) | OBJ-02, OBJ-04 | Browser URL bar inspection | Select a tier filter; confirm URL updates to `?tier=ControlPlane` without clicking any Apply button |
| Loading overlay covers only table area | OBJ-01 | Visual layout inspection | Change a filter; confirm semi-transparent overlay + Loader2 spinner appears over table only, not filter bar |
| Sheet opens from right on row click | OBJ-05 | Visual check | Click any table row; confirm Sheet slides in from right side |
| App shows EmptyState when PrivilegedEAM/ is empty | DASH-07 | Requires empty data state | Temporarily rename PrivilegedEAM/ dir; confirm "No privileged identity data yet" message and "Check Again" button appear; restore dir |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (smoke checks cover all tasks)
- [ ] Wave 0 covers all MISSING references (security.test.ts, eamReader.test.ts, vitest configs)
- [ ] No watch-mode flags (all commands use `--run`)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
