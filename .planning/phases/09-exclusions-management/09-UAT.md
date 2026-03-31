---
status: complete
phase: 09-exclusions-management
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md]
started: 2026-03-31T00:00:00Z
updated: 2026-03-31T22:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start fresh with `npm run dev` (or equivalent) from the gui/ directory. The server boots without errors, the app loads in your browser, and the primary UI is accessible (no blank screen or crash).
result: pass

### 2. Navigate to Exclusions via Sidebar
expected: The sidebar shows an "Exclusions" entry (shield-minus icon) positioned after "Reclassify" and before "Templates". Clicking it navigates to the /exclusions route and the Exclusions page renders.
result: pass

### 3. Exclusions Table Loads with Data
expected: The Exclusions page shows a table with columns: Display Name (with User/Bot icon inline), Object ID (full GUID), and an Actions column with a Remove button. Rows are populated from the GUID list in Global.json, with display names resolved from PrivilegedEAM files. If data is loading, skeleton rows are shown instead.
result: pass

### 4. Remove an Exclusion — No Confirmation
expected: Click Remove on any row. The row disappears immediately from the table without any confirmation dialog or modal. No page reload is required.
result: pass

### 5. Info Banner Appears After First Removal Only
expected: On the initial page load (before any removal), no info banner is visible. After successfully removing at least one exclusion, an info banner appears in the UI. It does not re-appear if you remove additional rows in the same session.
result: pass

### 6. Click-to-Copy Object ID (GUID)
expected: Click on a GUID in the Object ID column. The full GUID is copied to your clipboard. (You can verify by pasting into a text editor — it should contain the full GUID, not a truncated version.)
result: pass

### 7. Templates Global Tab — Read-Only
expected: Navigate to Templates, then open the Global (or Exclusions) tab. There is no UUID input field, no Add button, no Save/Confirm button, and no DiffDialog. The tab shows a read-only list of GUIDs fetched from the server, with a loading skeleton while fetching. An "Exclusions page →" link is visible on the tab.
result: issue
reported: "Tab bar wraps to two rows on the Templates page; the wrapped second row of tabs visually overlaps the Global Exclusions tab panel content, partially hiding the 'Exclusions are managed on the dedicated' text and 'Exclusions page →' link behind the tab buttons."
severity: cosmetic

### 8. "Exclusions page →" Link Navigates Correctly
expected: Click the "Exclusions page →" link in the Templates Global tab. It navigates to the /exclusions route, showing the Exclusions management page (not a 404 or blank page).
result: pass

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Global Exclusions tab panel content is fully visible with no UI elements overlapping it"
  status: failed
  reason: "User reported: Tab bar wraps to two rows; second row of tab buttons overlaps the tab panel content, hiding the description text and Exclusions page link behind the Global Exclusions and Audit Log tab buttons"
  severity: cosmetic
  test: 7
  artifacts: []
  missing: []

