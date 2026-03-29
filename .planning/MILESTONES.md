# Milestones

## v1.1 Pre-Apply Intelligence (Shipped: 2026-03-29)

**Phases completed:** 2 phases (7–8), 6 plans
**Timeline:** 2026-03-26 → 2026-03-28 (3 days)
**Git:** 22 commits, 31 files changed, +3,675 / -35 lines
**Codebase:** ~10,968 LOC TypeScript

**Key accomplishments:**
- Added `computedTierName()` shared utility (Priority-based tier reduction from `Classification[]` array)
- Dashboard KPI cards now show "Suggested: N" per tier alongside applied tier counts (DASH-01, DASH-02, DASH-03)
- Object Browser shows dashed-border computed tier badge for unclassified objects (OBJ-01, OBJ-02, OBJ-03)
- `GET`/`POST /api/overrides` endpoints with atomic writes and Zod validation — 9/9 tests passing
- `ReclassifyPage` with inline per-row tier override, amber dirty-row highlights, Save All / Discard action bar
- `/reclassify` route + sidebar nav entry; all 5 RECL requirements browser-verified (20/20 on verification)

---

