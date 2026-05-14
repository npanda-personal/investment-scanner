# UX-04 Visual System Hardening Architecture Contract

Date: 2026-05-14
Mode: UX Architecture Planning Mode
Work item: UX-04 visual system hardening (typography, density, table/filter/action-row patterns, dark-mode contrast, layout-hack removal)
Owner lane: Frontend Shared UI
Status: Architecture contract complete. Runtime implementation not started.

## 1. Objective

Deliver a bounded visual-system hardening packet that makes dense operational screens consistent, readable, and implementation-safe across the app without introducing decorative marketing UI.

Required UX-04 outcomes:

1. A compact typography and density scale applied through shared primitives.
2. Standard table, filter band, and header action-row behavior for data-heavy modules.
3. Dark-mode contrast semantics strong enough for repeated operational use.
4. Removal of page-level layout hacks that create overflow/width instability.
5. Work-focused visual consistency across core workflow surfaces.

## 2. In Scope vs Out of Scope

In scope:

- Theme token expansion in existing MUI theme setup.
- Shared component contract updates (`PageHeader`, `FilterBar`, `DataTable`, status semantics).
- Removal of `100vw`/page overflow layout hacks in scoped workflow pages.
- Dense but calm visual defaults for operational screens.
- QA contract for contrast, spacing rhythm, and responsive overflow behavior.

Out of scope:

- Backend/API/domain behavior changes.
- New paid design/testing tools or libraries.
- Marketing/hero visual redesign.
- Workflow IA rewrites covered by UX-01/UX-02/UX-03.
- Large feature logic refactors outside visual-system adoption.

## 3. Current-State Constraints and Evidence Anchors

1. Theme is currently mode-only (`createTheme({ palette: { mode } })`) with no product token layer in `frontend/src/app/ThemeContext.tsx`.
2. Header hierarchy is oversized for dense workflows (`PageHeader` uses `Typography variant="h4"` by default).
3. Multiple pages use local width/overflow hacks (`calc(100vw - ...)`, page-level `overflowX: hidden`) including:
   - `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
   - `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
   - `frontend/src/features/signal-generation-engine/components/SignalsDashboardPage.tsx`
4. Dense pages still rely on ad hoc card/alert/chip emphasis and inconsistent uppercase/letter spacing (notably `ResearchOverviewPage.tsx`).

## 4. UX-04 Visual Contract

## 4.1 Typography and Density Scale

Define a compact operational type scale (no giant scattered headings):

1. `workspaceTitle`: 28/34 semibold, used only for top workspace title.
2. `sectionTitle`: 20/28 semibold.
3. `panelTitle`: 16/24 semibold.
4. `body`: 14/20 regular.
5. `meta`: 12/18 regular.
6. `tableBody`: 13/18 regular.
7. `tableHeader`: 12/16 semibold.

Rules:

- Avoid uppercase headings as default UI pattern.
- Keep letter spacing at `0`.
- Use one heading role per surface band (header, section, panel) to avoid visual resets.

Density/spacing rhythm:

- Base spacing step `8px` (`4, 8, 12, 16, 24, 32` allowed increments).
- Standard vertical section spacing on dense pages: `16` or `24`, not arbitrary large jumps.
- Keep filter/action zones compact and adjacent to primary data.

## 4.2 Shared Pattern Contracts

### A. `PageHeader`

- Add density variants (`compact` default for operational modules, `standard` for hub-level pages).
- Normalize title/subtitle/action wrapping without page overflow.
- Standardize badge and secondary action spacing.

### B. `FilterBar` -> filter/action row contract

- Keep current `FilterBar` component as the single shared filter band primitive.
- Add explicit zones:
  1. primary filters,
  2. quick toggles/presets,
  3. reset + bounded actions.
- Maintain wrap behavior under narrow widths without horizontal page scroll.

### C. `DataTable`

- Keep shared table as canonical dense-table primitive.
- Add density option (default `compact`) so table typography/row heights are consistent.
- Keep horizontal scroll inside table container only.
- Standardize sticky header visual weight and row hover/selection contrast.

### D. status emphasis discipline

- Reuse existing status chips/badges but map them to restrained semantic palette.
- Reserve high-emphasis fills for blocker/error and immediate actions.
- Routine metadata should render in neutral/outlined patterns, not repeated high-emphasis cards.

## 4.3 Dark-Mode Contrast Contract

Dark mode must meet operational readability thresholds:

1. Primary text/background >= 7:1 target.
2. Secondary text/background >= 4.5:1 target.
3. Data-table header/body text >= 4.5:1.
4. Status chips/badges must keep readable foreground/background pairs in both modes.
5. Divider/surface boundaries must remain distinguishable without heavy saturation.

Token direction:

- Extend `palette`, `typography`, and component style overrides in one shared theme source.
- Avoid per-page hardcoded translucent backgrounds unless tokenized.

## 4.4 Layout-Hack Removal Contract

Disallow:

- `width: calc(100vw - ...)` inside page content areas.
- Page-level horizontal overflow suppression as a primary fix (`overflowX: hidden` on main content wrappers).
- Competing page-local max-width conventions without tier mapping.

Adopt:

1. Shell-owned width behavior via `NavigationLayout`.
2. Standard page container tiers:
   - `hub`: up to 1600
   - `workspace`: up to 1500
   - `detail`: up to 1200
3. Local horizontal scroll only for data containers (tables/charts), not the full page.

## 5. UX-04 Frontend Write Scope Reservation (For Implementation Owner)

Primary shared UI scope:

- `frontend/src/app/ThemeContext.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/index.css`
- `frontend/src/shared/components/PageHeader.tsx`
- `frontend/src/shared/components/FilterBar.tsx`
- `frontend/src/shared/components/DataTable.tsx`
- `frontend/src/shared/components/StatusBadge.tsx`
- `frontend/src/shared/components/index.ts`

Scoped adoption pages (phase 1 migration targets):

- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/src/features/signal-generation-engine/components/SignalsDashboardPage.tsx`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanDashboard.tsx`

Scoped UI test files for UX-04 verification updates:

- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `frontend/tests/ui/signal-generation-engine.spec.ts`
- `frontend/tests/ui/research-hub.spec.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `frontend/tests/ui/trade-plan-risk-engine.spec.ts`

Optional additive files (allowed if needed, no new library):

- `frontend/src/shared/theme/visualTokens.ts`
- `frontend/src/shared/theme/componentOverrides.ts`

## 6. Conflict Boundaries

1. No backend (`backend/**`), Prisma, or API contract edits.
2. No feature business-logic rewrites under UX-04.
3. No route/IA restructuring beyond visual-system needs.
4. Keep UX-04 edits limited to shared UI contracts plus scoped page adoption list.
5. If concurrent work touches scoped files, use merge-safe localized edits and avoid unrelated cleanup.

## 7. Acceptance Criteria (Architecture Contract)

UX-04 is accepted when all are true:

1. Theme includes explicit typography and density semantics used by shared components.
2. `PageHeader`, `FilterBar`, and `DataTable` expose consistent dense operational behavior.
3. Scoped pages no longer use `calc(100vw - ...)` layout hacks.
4. No page-level horizontal overflow in scoped workflows at common breakpoints.
5. Dark mode passes defined contrast checks for text, table headers/body, and status semantics.
6. Status emphasis is calmer and consistent; routine metadata is not rendered as high-alert UI.
7. Scoped pages preserve data density while improving scan hierarchy.
8. No paid dependencies/tools are introduced.

## 8. Implementation Sequence (for downstream dev owner)

1. Add shared visual tokens and component overrides in theme/provider layer.
2. Harden `PageHeader`, `FilterBar`, and `DataTable` contracts.
3. Remove shell/page width hacks and adopt container tiers.
4. Migrate scoped phase-1 workflow pages to the hardened patterns.
5. Update module-owned UI smoke specs for UX-04 assertions.
6. Execute UX-04 QA plan and capture evidence.

## 9. Dependencies / Blockers

External runtime dependencies: none.

Planning note:

- The synthesis doc references `docs/codex-agent-team-plan/ux-audits/2026-05-14-associate-ux-visual-system-audit.md`, but that file is currently missing from the repo. UX-04 planning used available roadmap/audit artifacts plus direct code evidence; this is a documentation gap, not a runtime blocker.

Known blocker status: none for implementation planning.

## 10. Readiness Verdict

UX-04 architecture planning is complete and bounded.
UX-04 can move to **Ready for Implementation** with one frontend owner and the paired UX-04 QA plan.
