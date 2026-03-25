---
created: 2026-03-25T17:12:55.513Z
title: Implement audit log for template editor changes
area: ui
files:
  - gui/client/src/pages/TemplatesPage.tsx
  - gui/client/src/components/templates/TierAccordion.tsx
  - gui/client/src/components/templates/GlobalExclusionsTab.tsx
---

## Problem

When users add or remove action chips (RoleDefinitionActions) or modify Global Exclusion GUIDs in the Classification Template Editor, there is no record of who changed what and when. Administrators need visibility into template change history for compliance and audit purposes.

## Solution

Implement an audit log that records template mutation events:
- Chip added / removed (which action, which category/service entry, which template file)
- Global Exclusion GUID added / removed
- Save events (timestamp, user identity if available, file changed)

Storage options to evaluate:
- Append to a local `.planning/audit-log.jsonl` or `Classification/audit-log.json`
- Write alongside git commits (already partially covered by git history)
- Surface in a dedicated "Audit Log" tab or panel in the UI

Backend API endpoint needed: `POST /api/audit` or append-to-file approach in the save route.
