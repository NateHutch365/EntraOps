---
created: 2026-03-26T23:23:53.277Z
title: Surface computed tier in Object Browser and dashboard
area: ui
files:
  - gui/client/src/pages/ObjectDetail.tsx:85
  - gui/client/src/components/objects/ObjectDetailPanel.tsx:58
  - gui/client/src/components/objects/ObjectTable.tsx:67
  - gui/server/routes/dashboard.ts:85
---

## Problem

The dashboard tier counts (ControlPlane / ManagementPlane / UserAccess) and the Object Browser "Tier" column both read from `ObjectAdminTierLevelName` — the tier formally stamped as a Custom Security Attribute in Entra ID. Until the apply step has been run (e.g. `New-EntraOpsPrivilegedAdministrativeUnit`), every object shows "Unclassified" and all dashboard counts are 0.

The engine already computed the suggested tier for every object in the `Classification[]` array inside each `PrivilegedEAM/*.json` file, but nowhere in the GUI is this surfaced. The user cannot see what tiers objects *will be* before applying, making the pre-apply review workflow impossible.

## Solution

Add a "Computed Tier" (or "Suggested Tier") derived from `Classification[]` to the Object Browser and/or dashboard, so the suggested classification is visible before any apply step has been run. The computed tier is the highest-priority (lowest `AdminTierLevel` number) entry in the `Classification[]` array.

Options to consider:
- Add a second badge or column in the Object Browser showing computed tier alongside the applied tier
- Use computed tier as the fallback for dashboard counts when `ObjectAdminTierLevelName` is "Unclassified"
- On the object detail panel, show a "Suggested classification" section listing all `Classification[]` entries with tier + service
- This also serves as the UI foundation for the reclassification override todo
