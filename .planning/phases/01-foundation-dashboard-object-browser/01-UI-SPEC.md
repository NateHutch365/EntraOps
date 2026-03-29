---
phase: 01
slug: foundation-dashboard-object-browser
status: draft
shadcn_initialized: false
preset: new-york
created: 2026-03-24
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for Phase 1: Foundation, Dashboard & Object Browser.
> Generated from CONTEXT.md decisions + RESEARCH.md stack. Read-only phase — no destructive actions.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui |
| Preset | new-york (Tailwind v4 only preset — `default` deprecated) |
| Component library | Radix UI (via shadcn/ui) |
| Icon library | lucide-react |
| Font | "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, sans-serif |

**Initialization command** (part of FOUND-01 scaffold):
```bash
cd gui/client
npx shadcn@latest init -t vite
# Select: new-york style, oklch colors
```

shadcn components required for this phase (install after init):
```bash
npx shadcn@latest add button badge card sheet collapsible popover command separator scroll-area skeleton table
```

---

## Spacing Scale

Declared values (all multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gaps, badge inner padding |
| sm | 8px | Compact element spacing (table cell padding, filter chip gap) |
| md | 16px | Default element spacing (card content padding, form field gap) |
| lg | 24px | Section padding (card outer spacing, panel section gap) |
| xl | 32px | Layout gaps (between KPI cards row and chart section) |
| 2xl | 48px | Major section breaks (dashboard sections) |
| 3xl | 64px | Page-level spacing (not used in Phase 1 — reserved) |

Exceptions:
- Sidebar expanded width: **220px** (not on 4px grid — standard sidebar convention)
- Sidebar collapsed width: **56px** (icon 20px + sm padding × 2 = 56px — aligns to 8px grid)
- Table row height: **44px** minimum (WCAG touch target for interactive rows)
- KPI card PIM mini-stat bar height: **4px** (accent bar, not a spacing token)

---

## Typography

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Label / Caption | 12px | 500 | 1.4 | Table column headers, filter chip text, badge text, secondary metadata |
| Body | 14px | 400 | 1.5 | Table cell content, panel prose, filter dropdown options |
| Heading | 20px | 600 | 1.2 | KPI card titles, panel section headings, page H1 |
| Display | 28px | 600 | 1.1 | KPI tier counts (ControlPlane: 47, ManagementPlane: 312…) |

Font weights in use: **400** (regular) and **600** (semibold). Bold (700) is not used — Segoe UI Variable renders 600 with sufficient weight on screen.

---

## Color

### Base Role Distribution

| Role | Token | Value (OKLCH) | Usage |
|------|-------|---------------|-------|
| Dominant (60%) | `--background` | `oklch(0.99 0 0)` | Page background, main content area |
| Secondary (30%) | `--muted` | `oklch(0.97 0 0)` | Sidebar background, KPI card surface, table header row, filter bar |
| Accent (10%) | `--fluent-accent` | `oklch(0.52 0.22 261)` | See reservation list below |
| Border | `--border` | `oklch(0.922 0 0)` | Table dividers, card borders, sidebar separator |
| Foreground | `--foreground` | `oklch(0.145 0 0)` | All body text |
| Muted foreground | `--muted-foreground` | `oklch(0.556 0 0)` | Labels, captions, timestamps, placeholder text |

Destructive: **not declared** — Phase 1 is read-only; no destructive actions exist in this phase.

### Accent Reservation (10% — strict list)

`oklch(0.52 0.22 261)` (#0078D4 approximate) is reserved **exclusively** for:
1. Active sidebar navigation item (background tint `oklch(0.52 0.22 261 / 0.08)` + left border `2px solid`)
2. Focus rings on keyboard-navigable elements (`outline-color: var(--fluent-accent)`)
3. ControlPlane tier badge background (see tier colors below)
4. Active filter chip border + dismiss icon (distinguishes active from inactive)
5. "Check Again" refresh button in empty state (sole primary action in that state)

All other interactive elements (table rows on hover, sidebar links unfocused, filter dropdowns) use `--muted` on hover — **not** the accent color.

### Tier Semantic Colors (Claude's Discretion)

Used in KPI badges, stacked bar chart segments, and detail panel tier badge:

| Tier | Color Token | Value (OKLCH) | Rationale |
|------|------------|---------------|-----------|
| ControlPlane | `--tier-control` | `oklch(0.52 0.22 261)` | Fluent accent blue — highest risk, primary brand color |
| ManagementPlane | `--tier-management` | `oklch(0.62 0.18 31)` | Amber-orange — elevated risk signal |
| UserAccess | `--tier-user` | `oklch(0.68 0.14 145)` | Teal-green — baseline access |
| Unclassified | `--tier-unclassified` | `oklch(0.72 0 0)` | Neutral gray — no classification |

These are added to `:root` in `globals.css` alongside the existing Fluent tokens, and mapped in `@theme inline`:
```css
--color-tier-control: var(--tier-control);
--color-tier-management: var(--tier-management);
--color-tier-user: var(--tier-user);
--color-tier-unclassified: var(--tier-unclassified);
```

---

## Copywriting Contract

### Navigation Labels

| Destination | Sidebar Label (expanded) | Sidebar Icon |
|-------------|--------------------------|--------------|
| Dashboard | Dashboard | `LayoutDashboard` (lucide) |
| Object Browser | Browse Objects | `Users` (lucide) |

### Empty States

| Context | Heading | Body | Action |
|---------|---------|------|--------|
| No `PrivilegedEAM/` data | "No privileged identity data yet" | "Run `Save-EntraOpsPrivilegedEAMJson` in your PowerShell terminal to generate EAM data, then check again." | **"Check Again"** (re-fetches `/api/dashboard`) |
| Object browser: filters produce zero results | "No objects match the active filters" | "Try clearing one or more filters to broaden the results." | **"Clear All Filters"** (resets all nuqs params) |
| No PrivilegedEAM git history | "No commit history yet" | "Changes to PrivilegedEAM/ will appear here once you've committed at least one run." | *(no action — informational only)* |

### Error States (per-widget, per CONTEXT.md specifics)

Each dashboard widget handles its own failure independently — a broken widget shows an inline error; the rest of the dashboard stays functional.

| Context | Error copy |
|---------|-----------|
| RBAC system file unreadable | "Could not read [RbacSystem] data — check file permissions on PrivilegedEAM/[RbacSystem]/[RbacSystem].json" |
| Git log unavailable | "Could not load recent commits — ensure PrivilegedEAM/ has a git history." |
| Object browser API error | "Failed to load objects. Check that the EntraOps server is running and retry." |
| Object detail not found | "Object not found — this identity may have been removed in a recent EAM run." |

### Action Labels

| Action | Label | Context |
|--------|-------|---------|
| Dismiss active filter chip | × (icon-only, with `aria-label="Remove [filter name] filter"`) | Filter bar |
| Expand role definition actions | "Show all [N] actions" | RoleDefinitionRow collapsed state |
| Collapse role definition actions | "Show fewer" | RoleDefinitionRow expanded state |
| Open full-page detail | "Open full page →" | Inside Sheet slide-out panel |
| Sidebar collapse toggle | `aria-label="Collapse sidebar"` / `aria-label="Expand sidebar"` | Sidebar toggle button |

No primary CTA that creates or mutates data — Phase 1 is read-only exploration.

---

## Visual Hierarchy & Focal Points

### Dashboard

**Focal point:** The three KPI cards (ControlPlane / ManagementPlane / UserAccess) are the first visual anchor — tier count in `display` size (28px/600) is the largest text on the page.

**Hierarchy:**
1. KPI counts (28px, `--tier-*` colored badge alongside) — draws eye first
2. RBAC stacked bar chart — answers "where does access come from?" below the fold of the cards
3. PIM Permanent/Eligible mini-stat inside each KPI card — secondary context, 12px label
4. Recent commits + data freshness — utility widgets, lowest visual weight (muted card, 12px timestamps)

**Card order (left to right):** ControlPlane → ManagementPlane → UserAccess (highest-risk first, reading order = risk order).

### Object Browser

**Focal point:** The paginated table. Filter bar above is utility — visually muted (`--muted` background), visually subordinate to the table.

**Hierarchy:**
1. Filter bar (top) — muted, compact (sm padding)
2. Active filter chips (below filter bar, above table) — accent border indicates active state
3. Table (primary content) — full remaining height; active sort column indicated with lucide `ArrowUp`/`ArrowDown` icon (12px, `--muted-foreground`)
4. Pagination controls (below table) — right-aligned, 12px label size

**Table column order:** Display Name · Object Type · Tier · RBAC System · PIM Type · On-Prem Sync

### Detail Panel (Sheet)

**Focal point:** `ObjectDisplayName` at 20px/600 is the visual anchor of the identity card header.

**Hierarchy (top to bottom in Sheet):**
1. Identity card header: Display Name (20px) + UPN (14px, muted) + ObjectType badge + Tier badge + OnPremSync indicator
2. Role assignment sections — grouped by RBAC system heading (14px/600)
3. Individual role rows — collapsible; closed state shows role name + PIM type only
4. `RoleDefinitionActions` — truncated to 5 lines, "Show all N actions" link

---

## Interaction Patterns

These are locked decisions from CONTEXT.md — must be implemented exactly:

| Pattern | Behavior | Implementation |
|---------|----------|---------------|
| Filter change | Live re-fetch on every dropdown selection change — no Apply button | nuqs `setFilters()` → triggers `useObjects` hook refetch via URL param change |
| Search box | Always visible in filter bar, left of dropdowns | Separate `<Input>` bound to `q` nuqs param |
| Table row click | Opens `<Sheet>` slide-out from right — table remains visible | `shadcn/ui <Sheet side="right" />` |
| Full-page detail | Permalink link inside Sheet only (not primary click) | `<Link to="/objects/:objectId">Open full page →</Link>` inside Sheet footer |
| Sidebar toggle | Collapses to icon-only (no labels); starts expanded | `useState(true)` in AppShell; CSS width transition `220px → 56px` |
| Loading state | Semi-transparent overlay + centered spinner over the stale table rows — **not** a skeleton replacement | `relative` wrapper on table + absolute `<div>` overlay with opacity-50 + lucide `Loader2` spinning |
| Active filter chips | Dismissible chips below filter bar, display currently active values | One chip per active filter value; X button calls `setFilters({ [key]: prev.filter(v => v !== chip) })` |
| RoleDefinitionActions | Truncated to 5 items; "Show all N actions" expands inline | `shadcn/ui <Collapsible>` per role row; default closed |

---

## Component Inventory

Components that must be installed via `npx shadcn@latest add` before any task references them:

| Component | Used In | Notes |
|-----------|---------|-------|
| `<Card>` + `<CardHeader>` + `<CardContent>` | KPI cards, widget cards | Dashboard |
| `<Badge>` | Tier badge, ObjectType badge, PIM type badge | Colored via `--tier-*` tokens |
| `<Sheet>` | Object detail slide-out | `side="right"` — OBJ-05 |
| `<Collapsible>` + `<CollapsibleTrigger>` + `<CollapsibleContent>` | RoleDefinitionActions expansion | OBJ-06 |
| `<Popover>` + `<PopoverContent>` | Multi-select filter dropdowns | OBJ-02 |
| `<Command>` + `<CommandInput>` + `<CommandItem>` | Filter option search within dropdowns | OBJ-02 |
| `<Separator>` | Section dividers in detail panel | OBJ-05 |
| `<ScrollArea>` | Sheet content when role list is long | OBJ-05 |
| `<Skeleton>` | Initial page load skeleton (first fetch only — not per-filter-change) | Dashboard + table |
| `<Table>` + `<TableHeader>` + `<TableBody>` + `<TableRow>` + `<TableCell>` | Object browser table shell | OBJ-01 (TanStack Table renders into this) |
| `<Button>` | "Check Again", "Clear All Filters", pagination controls | Various |

Do NOT hand-roll: dropdown with checkboxes (use Command+Popover), slide-out panel (use Sheet), expandable rows (use Collapsible), charts (use Recharts via ChartContainer).

---

## Loading State Visual (Claude's Discretion)

The loading overlay appears when a filter/page/sort change triggers a new Express fetch. It covers only the table area (not the entire page):

```
┌─────────────────────────────────────────┐
│ Filter bar                              │ ← not covered
├─────────────────────────────────────────┤
│ Active filter chips                     │ ← not covered
├─────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← semi-transparent overlay
│   [stale rows are visible but dimmed]   │   opacity-50 background
│              ◌ Loading                  │   Loader2 icon centered
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
├─────────────────────────────────────────┤
│ Pagination                              │ ← not covered
└─────────────────────────────────────────┘
```

Implementation: wrapper `<div className="relative">` around table; overlay `<div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">` conditionally rendered when `isFetching` is true.

---

## Stacked Bar Chart Orientation (Claude's Discretion)

RBAC system breakdown chart: **horizontal bars** (preferred per CONTEXT.md).

- X-axis: object count
- Y-axis: tier names (ControlPlane, ManagementPlane, UserAccess)
- Bar segments: RBAC systems (`--tier-control`, `--tier-management`, `--tier-user` colors not used here — use distinct segment colors below)

Chart segment colors for RBAC systems:
| RBAC System | Segment Color (OKLCH) |
|-------------|-----------------------|
| EntraID | `oklch(0.52 0.22 261)` — Fluent accent blue |
| ResourceApps | `oklch(0.62 0.18 31)` — Amber |
| IdentityGovernance | `oklch(0.68 0.14 145)` — Teal |
| DeviceManagement | `oklch(0.56 0.18 300)` — Purple |
| Defender | `oklch(0.60 0.20 14)` — Red-orange |

Chart height: **200px** (use `<ChartContainer className="h-[200px] w-full">` — avoids Recharts ResponsiveContainer 0-height pitfall).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | button, badge, card, sheet, collapsible, popover, command, separator, scroll-area, skeleton, table | not required |

No third-party registries. All components sourced from `shadcn` official registry only.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
