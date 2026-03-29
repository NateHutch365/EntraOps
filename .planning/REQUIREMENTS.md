# Requirements: EntraOps GUI v1.2

**Defined:** 2026-03-29
**Core Value:** A user who has run `Save-EntraOpsPrivilegedEAMJson` can open a browser and immediately understand who holds ControlPlane access in their tenant — without writing a KQL query, opening Azure Portal, or reading raw JSON.

## v1.2 Requirements

### Exclusions Management

- [ ] **EXCL-01**: User can navigate to a dedicated Exclusions page from the sidebar
- [ ] **EXCL-02**: Exclusions page lists all excluded objects with their resolved display names (not raw GUIDs)
- [ ] **EXCL-03**: User can remove an exclusion from the Exclusions page, persisting the deletion to Global.json atomically
- [ ] **EXCL-04**: User can exclude an object directly from the Object Browser via a one-click row action, persisting the addition to Global.json atomically
- [ ] **EXCL-05**: User can exclude an object directly from the Reclassify screen via a one-click row action, persisting the addition to Global.json atomically

### Implementation Workflow

- [ ] **IMPL-01**: User can navigate to an "Apply to Entra" implementation screen from the sidebar
- [ ] **IMPL-02**: User can reach the implementation screen via a call-to-action from the Object Browser and Reclassify screens
- [ ] **IMPL-03**: User sees a pre-run confirmation screen showing which cmdlets will run, their parameters, and tier scope before committing
- [ ] **IMPL-04**: User can select which implementation actions to apply (Administrative Units, Conditional Access Groups, Unprotected AUs, ControlPlane Scope — any combination)
- [ ] **IMPL-05**: User can run a dry-run / preview mode that simulates changes without writing to Entra (uses cmdlet -SampleMode or equivalent)
- [ ] **IMPL-06**: User sees a real-time streaming progress log (SSE) while implementation cmdlets execute
- [ ] **IMPL-07**: User sees an outcome summary showing pass/fail status per cmdlet after the implementation run completes

## Future Requirements

### Deferred to Post-v1.2

- Pre-install prerequisite PowerShell modules (Az.Accounts, Az.Resources, Az.ResourceGraph) in UI setup gate
- Fix terminal line spacing in ConnectPage SSE output (ansi-to-html block-level wrapper injection)
- Alerting / notifications — flag new ControlPlane identities after classification run
- Attack path analysis — privilege chain tracing, blast radius, exposure scoring
- AI/Copilot integration — plain-English tier explanations, remediation suggestions, natural language search

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud hosting / SaaS | Local developer tool only |
| Real-time Graph API calls | GUI reads from files only |
| User authentication / multi-tenancy | Single-user, single-tenant, trusted local tool |
| Mobile/tablet | Desktop browser only |
| Full Entra policy management | Scope limited to AU/CA group membership; not a general Entra admin UI |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXCL-01 | Phase 9 | Pending |
| EXCL-02 | Phase 9 | Pending |
| EXCL-03 | Phase 9 | Pending |
| EXCL-04 | Phase 10 | Pending |
| EXCL-05 | Phase 10 | Pending |
| IMPL-01 | Phase 11 | Pending |
| IMPL-02 | Phase 11 | Pending |
| IMPL-03 | Phase 11 | Pending |
| IMPL-04 | Phase 11 | Pending |
| IMPL-05 | Phase 12 | Pending |
| IMPL-06 | Phase 11 | Pending |
| IMPL-07 | Phase 11 | Pending |
