# UX-04 Visual System Hardening QA Plan

Date: 2026-05-14
Mode: UX Architecture Planning Mode
Work item: UX-04 visual-system QA planning
Status: QA plan complete. Awaiting UX-04 implementation.

## 1. Scope

Validate UX-04 only:

- typography/density scale behavior,
- shared table/filter/action-row patterns,
- dark-mode contrast and status readability,
- removal of layout hacks causing overflow/width instability,
- dense but usable work-focused visual consistency.

Out of scope:

- backend correctness/data semantics,
- workflow IA restructuring (UX-01/02/03),
- feature-level domain logic changes.

## 2. Source Contracts

- `docs/ux-ui-best-practices.md`
- `docs/codex-agent-team-plan/ux-roadmaps/2026-05-14-lead-ux-redesign-roadmap.md`
- `docs/codex-agent-team-plan/ux-roadmaps/2026-05-14-ux-associate-synthesis-and-po-review.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-14-ux04-visual-system-architecture.md`

## 3. Acceptance Verification Matrix

1. Typography and hierarchy validation
   - Verify page headers, section titles, panel titles, body/meta text follow UX-04 compact scale.
   - Verify no oversized headline-style typography on routine operational pages.
   - Verify uppercase/letter-spacing heavy heading patterns are reduced to approved contexts only.

2. Density and spacing rhythm validation
   - Verify shared spacing rhythm is consistent in scoped pages (header -> filters/actions -> data surface).
   - Verify controls remain dense but readable (no cramped overlap, no excessive whitespace bands).

3. Shared filter/action-row validation
   - Verify `FilterBar` behavior is consistent across scoped pages:
     - controls wrap inside container,
     - reset is visible and usable,
     - bounded action buttons remain reachable on narrow widths.
   - Verify changing filters resets local pagination to first page where applicable.

4. Shared table pattern validation
   - Verify scoped tables use consistent dense typography and row rhythm.
   - Verify horizontal scroll remains inside table container only.
   - Verify sticky headers and row interaction contrast are readable in light and dark modes.

5. Dark-mode contrast validation
   - Toggle dark mode and verify:
     - primary text readability on page backgrounds,
     - secondary text readability,
     - table header/body readability,
     - status chip/badge foreground/background readability.
   - Spot-check contrast using browser devtools color contrast inspector on representative elements.

6. Layout-hack and overflow validation
   - Verify scoped pages do not rely on `calc(100vw - ...)` width hacks after implementation.
   - Verify no page-level horizontal overflow on common viewports.
   - Verify shell/content sizing remains stable with drawer expanded/collapsed.

7. Work-focused UI validation
   - Verify routine metadata is not over-emphasized as warning/error-like UI.
   - Verify blocker/error states still visually outrank neutral informational states.
   - Verify dense operational surfaces remain scannable for repeated use.

## 4. Test Surfaces and File-Focused QA

Primary page routes:

- `/market-data-foundation`
- `/data-quality`
- `/signals`
- `/research`
- `/today-review`
- `/trade-plans`

Primary shared files under verification:

- `frontend/src/app/ThemeContext.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/shared/components/PageHeader.tsx`
- `frontend/src/shared/components/FilterBar.tsx`
- `frontend/src/shared/components/DataTable.tsx`
- `frontend/src/shared/components/StatusBadge.tsx`

UI smoke specs to update/execute:

- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `frontend/tests/ui/signal-generation-engine.spec.ts`
- `frontend/tests/ui/research-hub.spec.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `frontend/tests/ui/trade-plan-risk-engine.spec.ts`

## 5. Regression Watchlist

1. Header action wrapping regressions on small/medium widths.
2. Table container overflow leaking to page-level horizontal scroll.
3. Dark-mode chip/badge contrast regressions for warning/error/info states.
4. Drawer width transitions breaking main-content width alignment.
5. Filter reset/pagination reset behavior drift after shared `FilterBar` hardening.
6. Over-application of low-emphasis styles that makes blockers too subtle.

## 6. Evidence Required for Signoff

1. Screenshot set (light and dark):
   - each scoped route first viewport,
   - one dense table view per scoped module,
   - one filter/action-row view per scoped module.
2. Contrast spot-check log:
   - element sampled,
   - measured ratio from devtools,
   - pass/fail against UX-04 targets.
3. Overflow audit log:
   - viewport tested (desktop/tablet/mobile widths),
   - horizontal overflow present/absent,
   - affected route if failed.
4. Automated UI smoke summary for scoped specs.
5. Defect list with severity, owning file, and repro route.

## 7. Exit Criteria

QA passes UX-04 when:

1. All acceptance verification matrix checks pass.
2. No high-severity contrast/overflow regressions remain.
3. Scoped pages are visually consistent with compact operational style.
4. No out-of-scope UX packet changes are bundled.

## 8. Blockers

Current blockers: none at planning stage.

Known documentation gap (non-blocking):

- `docs/codex-agent-team-plan/ux-audits/2026-05-14-associate-ux-visual-system-audit.md` is referenced by synthesis but missing in repo.

## 9. Handoff Status

QA planning complete; execution blocked on UX-04 implementation delivery and test evidence.
