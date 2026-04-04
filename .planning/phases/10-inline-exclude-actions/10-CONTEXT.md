# Phase 10: Inline Exclude Actions — Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 delivers: admins can exclude any object directly from the Object Browser or Reclassify screen via a one-click row action, without navigating to the Exclusions page. The exclusion is persisted atomically to `Global.json` immediately. No new pages — this phase adds an action column to two existing tables only.

**Requirements in scope:** EXCL-04, EXCL-05
**Depends on:** Phase 9 (POST `/api/exclusions` backend endpoint must exist)
**Feeds into:** Phase 11 (Implementation Workflow — all exclusion management complete)

</domain>

<decisions>
## Implementation Decisions

### Row Action Form Factor (Area A)

- **D-01:** Dedicated always-visible **Actions column** at the far right of both tables — same pattern as the Remove column on the Exclusions page. No discovery friction; no hover required.
- **D-02:** Action is an **icon-only button** using `ShieldMinus` (matches the Exclusions nav icon) with a tooltip "Exclude from classification". No text label to keep column narrow.
- **D-03:** Object Browser detail panel has **no Exclude action** — table row only. The panel remains read-only. Avoids a second implementation surface.
- **D-04:** When a row is already excluded, the Exclude button is **disabled (not hidden)** — user can see the action exists but understands it's already applied. Consistent with the Override Select disabled state on Reclassify.

### Already-Excluded Row Presentation on Object Browser (Area B)

- **D-05:** Excluded objects **remain visible** in the Object Browser — hiding them would create "where did that object go?" confusion and complicate filter logic.
- **D-06:** Object Browser adopts the **same treatment as ReclassifyPage** — `opacity-60` row dim + inline "Excluded" badge next to the display name (in the Display Name cell, same as Reclassify). No new visual patterns.
- **D-07:** No show/hide excluded filter toggle in Phase 10 — deferred, not Phase 10 scope.
- **D-08:** `useExclusions` hook is updated to fetch from **`/api/exclusions`** (the Phase 9 rich endpoint) instead of the old `/api/templates/global`. Returns `{ guid, displayName, objectType, resolved }[]` — Phase 10 only needs the `guid` values for the Set, but the hook update eliminates a tech-debt stale route dependency.

### Post-Exclude Feedback and Data Refresh (Area C)

- **D-09:** **No stale-data banner** on Object Browser or Reclassify after an exclude action — the banner belongs on the Exclusions page (Phase 9 established this). A toast is sufficient here.
- **D-10:** After a successful exclude, **invalidate the `useExclusions` hook** via its existing `invalidate()` pattern. Row reflects "Excluded" once the hook refetches — no optimistic state, no manual DOM update.
- **D-11:** **Individual toast per action** ("Object excluded") via existing `sonner` Toaster — no debounced summary. Excludes are deliberate one-at-a-time actions; sonner stacks cleanly.
- **D-12:** Exclude button shows a **loading spinner** while the POST is in flight and is disabled during the request — prevents double-clicks. No optimistic UI/rollback complexity.

### Reclassify Screen Edge Case — Pending Override + Exclude (Area D)

- **D-13:** Exclude fires **immediately** and **silently removes that row's pending override** from the pending map — no warning dialog. Consistent with Phase 9's no-dialog philosophy; an excluded object cannot have a meaningful tier override.
- **D-14:** Pending map entry for the excluded row is **removed synchronously** in the same click handler before the POST — keeps the "Save All (N)" count accurate and eliminates ghost dirty rows.
- **D-15:** Pending count accuracy is **synchronous** — map update precedes the async POST, so the button label reflects the correct count immediately with no lag.
- **D-16:** Excluding from Reclassify **updates in place** — no navigation away, user stays on the Reclassify screen.

### Claude's Discretion

- Exact hover tooltip delay and copy UX for the `ShieldMinus` button
- Column width for the Actions column (keep it as narrow as sensible — icon only)
- Error toast wording if the POST fails ("Failed to exclude object")
- Whether to show an error state on the button itself (red tint) vs toast-only on failure
- `useExclusions` hook internal implementation detail: whether to map the full `ExclusionItem[]` response to `Set<string>` (guids) for backward compatibility with existing consumers

</decisions>

<specifics>
## Specific Ideas

- "Exclude" action is icon-only (`ShieldMinus`) with tooltip — same icon as the Exclusions sidebar nav entry. Visual consistency reinforces what clicking it does.
- Both screens follow Phase 9's immediate + toast pattern — no staging, no confirmation, no dialogs.
- The `useExclusions` hook update (D-08) benefits ReclassifyPage and Object Browser simultaneously since both consume the same hook.
- On Reclassify, the exclude handler should: (1) remove ObjectId from pending map, (2) fire the POST, (3) on success: toast + invalidate exclusions; on failure: toast error and restore pending map entry if it was removed.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend — Phase 9 Exclusions API (already built)
- `gui/server/routes/exclusions.ts` — `GET /api/exclusions` and `DELETE /api/exclusions/:guid` exist. Phase 10 adds `POST /api/exclusions` (add a GUID). Must follow the same `atomicWrite` + Zod validation pattern.
- `gui/shared/types/templates.ts` — `GlobalFile` type: `[{ ExcludedPrincipalId: string[] }]`. POST handler appends to this array.
- `gui/server/utils/atomicWrite.ts` — Required for the POST handler (temp-file-then-rename).

### Client — Existing Exclusion Infrastructure
- `gui/client/src/hooks/useExclusions.ts` — Hook to update (D-08): change fetch from `/api/templates/global` to `/api/exclusions`. The hook currently returns `{ exclusions: Set<string>, isLoading, invalidate }` — maintain this interface so ReclassifyPage and ObjectBrowser work without changes to their consumption pattern.
- `gui/client/src/pages/ReclassifyPage.tsx` — Already imports `useExclusions`. Has `invalidate` from the hook. Phase 10 adds: exclude click handler, pending-map cleanup (D-13/D-14), `ShieldMinus` Actions column.
- `gui/client/src/components/objects/ObjectTable.tsx` — Phase 10 adds: exclusion awareness from a new `excludedIds` prop, "Excluded" badge in Display Name cell, `opacity-60` row dim, disabled `ShieldMinus` Actions column button. Needs `onExclude` callback prop.
- `gui/client/src/pages/ObjectBrowser.tsx` — Phase 10 wires `useExclusions` and passes `excludedIds` + `onExclude` down to `ObjectTable`.

### Phase 9 Patterns to Reuse
- `gui/client/src/pages/ExclusionsPage.tsx` — Immediate remove + toast pattern. Phase 10 mirrors this for add.
- `gui/client/src/pages/ReclassifyPage.tsx` — "Excluded" badge and `opacity-60` row dim (lines ~185–200). Reuse exactly in ObjectTable.
- Existing `sonner` Toaster already mounted in app root — use `toast.success()` / `toast.error()`.

</canonical_refs>
