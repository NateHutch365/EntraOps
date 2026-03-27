# Roadmap: EntraOps GUI

## Milestones

- [x] **v1.0** ✅ SHIPPED 2026-03-26 — Full GUI: dashboard, object browser, template editor, PowerShell runner, Connect wizard, git history, settings (6 phases, 30 plans, 338 files) — [archive](.planning/milestones/v1.0-ROADMAP.md)
- [ ] **v1.1** 🔄 IN PROGRESS — Pre-Apply Intelligence: computed/suggested tier surfaces in Dashboard & Object Browser; Object-Level Reclassification screen (2 phases)

## Current Milestone: v1.1 Pre-Apply Intelligence

**Goal:** Surface the engine's computed classification before the apply step, and give admins an inline review screen to override individual object tier assignments.

**Phase numbering continues from v1.0 (which ended at Phase 6).**

## Phases

- [ ] **Phase 7: Computed Tier Surfaces** — Computed (suggested) tier derived from `Classification[]` is visible in the Dashboard and Object Browser alongside applied tier
- [ ] **Phase 8: Object Reclassification Screen** — Admins can review all objects' applied and computed tiers on a dedicated screen and save inline tier overrides to classification config files

## Phase Details

### Phase 7: Computed Tier Surfaces
**Goal**: Security admins can see, side-by-side, how many objects are applied to each tier vs. how many the engine suggests — and unclassified objects in the Object Browser show their computed tier rather than a blank badge
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: DASH-01, DASH-02, DASH-03, OBJ-01, OBJ-02, OBJ-03
**Success Criteria** (what must be TRUE):
  1. Dashboard shows two counts per tier (Applied / Suggested) with clearly labelled columns derived from live `PrivilegedEAM/` data
  2. Suggested counts reflect the lowest `AdminTierLevel` number in each object's `Classification[]` array; objects with no `Classification[]` entries contribute 0 to Suggested counts
  3. An unclassified object in the Object Browser shows its computed tier badge with a visually distinct dashed outline style in the Tier column
  4. Objects with an applied tier show no change to their existing Tier column appearance
**Plans**: 2 plans
Plans:
- [ ] 07-01-PLAN.md — Shared computedTierName utility + API types + server aggregation
- [ ] 07-02-PLAN.md — KPICard suggested count + ObjectTable dashed badge
**UI hint**: yes

---

### Phase 8: Object Reclassification Screen
**Goal**: Admins can navigate to a dedicated reclassification screen, review all objects' applied and computed tiers side-by-side, override individual object tier assignments inline, and save changes back to classification config files
**Depends on**: Phase 7
**Requirements**: RECL-01, RECL-02, RECL-03, RECL-04, RECL-05
**Success Criteria** (what must be TRUE):
  1. A Reclassification page is accessible from the sidebar nav; it lists all privileged objects with both applied tier and computed tier visible per row
  2. User can select a different (override) tier for any individual object directly in the list via an inline control, and pending overrides are highlighted visually before any save
  3. Clicking Save commits all pending overrides to the appropriate classification config files — overrides persist across GUI restarts
  4. User can discard all pending overrides with a Discard/Cancel action, returning the list to its pre-edit state
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Computed Tier Surfaces | 0/2 | Planned | - |
| 8. Object Reclassification Screen | 0/? | Not started | - |
