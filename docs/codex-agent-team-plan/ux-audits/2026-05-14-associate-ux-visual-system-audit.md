# Associate UX Visual System Audit

Date: 2026-05-14
Mode: UX Discovery Mode
Owner lane: Associate UX - Visual System
Status: Reconstructed planning artifact from UX-04 architecture evidence

## Scope

This audit covers cross-app visual-system consistency for dense trading and investment workflows:

- typography scale,
- density and spacing rhythm,
- shared table/filter/action-row patterns,
- dark-mode contrast,
- page-width and overflow stability,
- status/emphasis discipline.

## Findings

1. The app relies on mode-only theming and does not yet define product-level typography, density, or status-emphasis tokens.
2. Routine operational pages use oversized headers and scattered local spacing, which reduces scan efficiency.
3. Several data-heavy pages use local width hacks such as `calc(100vw - ...)` and page-level overflow suppression instead of shell-owned layout constraints.
4. Filter/action rows, data tables, and status chips are implemented inconsistently across modules, making transitions between workflows feel rough.
5. Dark-mode readability depends too much on default component behavior and per-page styling, so contrast should be standardized through shared theme/component contracts.

## Recommended Direction

- Add compact operational typography and density semantics to the shared theme.
- Harden `PageHeader`, `FilterBar`, `DataTable`, and status-badge behavior before broad page rewrites.
- Remove page-level width hacks in a scoped first migration across Market Data, Data Quality, Signals, Research, Today Review, and Trade Plans.
- Keep the UI work-focused, dense, and calm; avoid decorative landing-page patterns.
- Verify light/dark contrast, table overflow, filter wrapping, and header action wrapping before Lead PO review.

## Handoff

This audit feeds:

- `docs/codex-agent-team-plan/architecture-contracts/2026-05-14-ux04-visual-system-architecture.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-14-ux04-visual-system-qa-plan.md`
