---
phase: 04-connect-classify-setup
plan: 04
subsystem: ui
tags: [connect, wizard, powershell, sse, human-verify]

requires:
  - phase: 04-connect-classify-setup/04-03
    provides: ConnectPage 4-step wizard and Sidebar status indicator

provides:
  - Human-verified end-to-end Phase 4 Connect & Classify flow approved and working in browser
  - Auth stream (device code), RBAC selection, classification stream, toast, and sidebar indicator all confirmed

affects:
  - Phase 5 (Git Change History) — depends on Phase 4 complete
  - Phase 5.5 (Object-Level Reclassification) — depends on Phase 4 complete

tech-stack:
  added: []
  patterns:
    - "AlreadyAuthenticated flag: pass Az/MgGraph tokens to classify process as env vars — each pwsh spawn is isolated, session state does not survive between processes"
    - "DefaultFolderClassification globals: must be initialised in the classify process itself — connect-process globals don't survive to a new spawn"

key-files:
  created: []
  modified:
    - gui/server/src/services/connectService.ts

key-decisions:
  - "Each pwsh spawn is fully isolated: Az/MgGraph tokens acquired in the connect process must be forwarded to the classify process via AlreadyAuthenticated env vars"
  - "Import-Module separator: semicolon required between Import-Module and Connect-EntraOps invocations — missing separator caused Connect-EntraOps to be parsed as an Import-Module argument"
  - "DefaultFolderClassification globals initialised inside classify spawn, not assumed from connect process"
  - "TenantName is NOT a valid parameter for Save-EntraOpsPrivilegedEAMJson — removed from classify invocation"

patterns-established: []

requirements-completed:
  - CONN-01
  - CONN-02
  - CONN-03

duration: ~45min
completed: 2026-03-26
---

# Phase 4 Plan 04: Human Verification Summary

**End-to-end Phase 4 wizard verified in browser: auth stream, RBAC selection, classification stream, toast, and sidebar indicator all confirmed working after fixing 4 PowerShell inter-process isolation bugs.**

## Performance

- **Duration:** ~45 min (including bug fixes during verification)
- **Started:** 2026-03-25T21:04:15Z
- **Completed:** 2026-03-26
- **Tasks:** 1 (human-verify checkpoint — approved)
- **Files modified:** 1 (connectService.ts)

## Accomplishments

- Human verified the complete Phase 4 Connect & Classify wizard end-to-end in a real browser
- Fixed 4 PowerShell inter-process isolation issues discovered during verification that prevented auth → classify hand-off
- All 3 CONN requirements (CONN-01, CONN-02, CONN-03) confirmed working

## Task Commits

Bug fixes applied during verification:

1. **Remove TenantName param** — `f1a3b3a` (fix: TenantName not accepted by Save-EntraOpsPrivilegedEAMJson)
2. **Initialise DefaultFolderClassification globals in classify process** — `438ab16` (fix: connect-process globals don't survive to classify spawn)
3. **Pass Az/MgGraph tokens via AlreadyAuthenticated** — `e39d82c` (fix: Graph session from connect process doesn't survive to classify process)
4. **Add semicolon between Import-Module and Connect-EntraOps** — `75847da` (fix: missing separator caused cmdlet to be parsed as module arg)

**Plan metadata:** (this commit)

## Files Created/Modified

- `gui/server/src/services/connectService.ts` — Fixed authInit script (semicolon, AlreadyAuthenticated token forwarding, DefaultFolderClassification, TenantName param)

## Decisions Made

- Each `pwsh` spawn is fully process-isolated. Az and MgGraph tokens acquired during the connect stream must be explicitly forwarded to the classify spawn via environment variables under the `AlreadyAuthenticated` pattern.
- `Import-Module` and subsequent cmdlet calls must be separated by `;` — without it PowerShell parses the cmdlet name as an `-AssemblyName` argument to `Import-Module`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TenantName is not a valid parameter for Save-EntraOpsPrivilegedEAMJson**
- **Found during:** Task 1 (human verification)
- **Issue:** Classify process crashed with "A parameter cannot be found that matches parameter name 'TenantName'"
- **Fix:** Removed `-TenantName $tenantName` from the Save-EntraOpsPrivilegedEAMJson invocation in connectService.ts
- **Files modified:** gui/server/src/services/connectService.ts
- **Committed in:** `f1a3b3a`

**2. [Rule 1 - Bug] DefaultFolderClassification globals not initialised in classify process**
- **Found during:** Task 1 (human verification)
- **Issue:** Classification stream failed because DefaultFolderClassification globals were set in the connect process but each pwsh spawn is fresh
- **Fix:** Added DefaultFolderClassification initialisation to the classify script inside connectService.ts
- **Files modified:** gui/server/src/services/connectService.ts
- **Committed in:** `438ab16`

**3. [Rule 1 - Bug] Az/MgGraph auth tokens not forwarded to classify process**
- **Found during:** Task 1 (human verification)
- **Issue:** Classification stream failed with authentication error — Graph session from connect process does not survive to the classify spawn
- **Fix:** Captured Az/MgGraph tokens at end of auth stream and passed them to classify spawn as env vars; classify script calls `AlreadyAuthenticated` to restore session
- **Files modified:** gui/server/src/services/connectService.ts
- **Committed in:** `e39d82c`

**4. [Rule 1 - Bug] Missing semicolon between Import-Module and Connect-EntraOps**
- **Found during:** Task 1 (human verification)
- **Issue:** PowerShell parsed `Connect-EntraOps` as an argument to `Import-Module -AssemblyName` due to missing `;` separator, so `AlreadyAuthenticated` was never called
- **Fix:** Added `;` between the `Import-Module` call and the `Connect-EntraOps` invocation
- **Files modified:** gui/server/src/services/connectService.ts
- **Committed in:** `75847da`

## Self-Check

- [x] SUMMARY.md created with frontmatter and all required sections
- [x] Commits e39d82c and 75847da (latest fixes) confirmed in git log
- [x] Human verification approved — all browser checks passed per checkpoint response
- [x] Requirements CONN-01, CONN-02, CONN-03 marked complete
