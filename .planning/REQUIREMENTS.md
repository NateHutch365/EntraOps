# Requirements: EntraOps GUI v1.1

**Defined:** 2026-03-26
**Core Value:** A user who has run `Save-EntraOpsPrivilegedEAMJson` can open a browser and immediately understand who holds ControlPlane access in their tenant — without writing a KQL query, opening Azure Portal, or reading raw JSON.

## v1.1 Requirements

### Dashboard Computed Tier

- [ ] **DASH-01**: Dashboard displays both applied tier counts and computed tier counts side-by-side per tier (ControlPlane / ManagementPlane / UserAccess)
- [ ] **DASH-02**: Computed tier is derived from the lowest `AdminTierLevel` number in an object's `Classification[]` array
- [ ] **DASH-03**: Dashboard visually distinguishes applied vs. computed counts with clear "Applied" / "Suggested" labels

### Object Browser Computed Tier

- [ ] **OBJ-01**: When `ObjectAdminTierLevelName` is "Unclassified", the Tier column shows the computed tier instead
- [ ] **OBJ-02**: Computed tier badge is visually distinct from an applied tier (dashed outline style)
- [ ] **OBJ-03**: When an applied tier is set, existing Tier column behaviour is unchanged

### Object-Level Reclassification

- [ ] **RECL-01**: User can navigate to an Object Reclassification screen listing all objects with their applied and computed tiers
- [ ] **RECL-02**: User can select an override tier for an individual object inline
- [ ] **RECL-03**: Pending overrides are tracked visually before save
- [ ] **RECL-04**: User can save overrides — changes persist to classification config files
- [ ] **RECL-05**: User can discard unsaved override selections

## Future Requirements

### Deferred from v1.0

- HIST-05: Empty state when `PrivilegedEAM/` has no git history
- Incomplete shared types barrel (`connect.ts`, `config.ts` not re-exported)
- Duplicate `RbacSystem` type consolidation

### Post-v1.1 Candidates

- Alerting / notifications — flag new ControlPlane identities after a classification run
- Attack path analysis — privilege chain tracing, blast radius, exposure scoring
- AI/Copilot integration — plain-English tier explanations, remediation suggestions, natural language search
- PDF/CSV export of Object Browser results

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud hosting / SaaS | Local developer tool only |
| Real-time Graph API calls | GUI reads from files only |
| User authentication / multi-tenancy | Single-user, single-tenant, trusted local tool |
| Mobile/tablet | Desktop browser only |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 7 | Pending |
| DASH-02 | Phase 7 | Pending |
| DASH-03 | Phase 7 | Pending |
| OBJ-01 | Phase 7 | Pending |
| OBJ-02 | Phase 7 | Pending |
| OBJ-03 | Phase 7 | Pending |
| RECL-01 | Phase 8 | Pending |
| RECL-02 | Phase 8 | Pending |
| RECL-03 | Phase 8 | Pending |
| RECL-04 | Phase 8 | Pending |
| RECL-05 | Phase 8 | Pending |
