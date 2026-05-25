# Team 00 Signal Calibration Page Hardening Summary

Date: 2026-05-26

## Review Inputs

- Product Owner review: page summary must be aggregate, not first-row based; export label must match CSV output; confidence wording must mean evidence/sample reliability; table should be less dense; internal enum language should be softened.
- QA review: duplicate stock rows must not appear in the main table; pagination/export must not stop after the first page; reset must clear filters reliably; evidence filter was unsafe because evidence is derived after persistence.
- Architect review: immediate hardening can stay module-local with no schema, route, package, or shared UI change; latest rows should be deterministic and model-version scoped. Longer-term, the repository should move latest-per-instrument pagination to a DB window query or persisted evidence/index slice.

## Implemented

- Main calibration list now returns one latest calibration row per instrument for the current calibration model.
- Latest lookup tie-breakers now use `generatedAt desc`, `updatedAt desc`, and `id asc`.
- Default table sort is calibrated score descending.
- `hasMore` is calculated from filtered total, offset, and limit so pagination and export can continue.
- Sample confidence no longer falls back to `INSUFFICIENT_SAMPLE` when current Signal Quality summary evidence is sufficient but older persisted rows lack stored group evidence.
- Removed the unsafe Evidence filter from the UI until evidence/readiness is persisted or DB-queryable.
- Reset now clears search and filters in one request path.
- Export is labeled `Export CSV`, uses Excel-compatible CSV with BOM, includes audit fields, and neutralizes formula-leading text cells.
- Summary cards now use visible-page aggregate counts instead of the first row.
- Table labels were softened from internal/action-like language toward research-support wording.

## Remaining Architecture Follow-Up

- Repository `top()` still uses bounded module-local hardening rather than a DB window-query implementation. A future architecture slice should implement latest-per-instrument pagination/counting in SQL or persist evidence/readiness fields with supporting indexes.
- Evidence-status filtering remains intentionally unavailable in the UI until evidence can be filtered accurately.
