# Audit: Historical Context Coverage Scope and Data-Quality Trust Gap

Date: 2026-05-19

Mode: Read-only source inspection plus docs-only audit output.

## Scope Inspected

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `frontend/src/features/historical-context-snapshots/hooks/useHistoricalContextSnapshots.ts`
- `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-requirement.md`

Team 02 is not currently editing this module area. This audit does not duplicate `CF-W1-MD-04` or `CF-W1-SIG-02`.

## Concrete Evidence

- The module doc already admits the core gap: `Data-quality snapshot rows are still keyed by instrument and date; coverage counts are global for data quality until that model gains a stock relation or persisted scope fields.` `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md:106-112`
- The repository counts `dataQualitySnapshot` rows with `count()` and no `region` or `assetType` filter in `coverage(...)`, so the number cannot tell the user whether it is scoped evidence or a global instrument count. `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts:88-105`
- The service returns that raw count unchanged. `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts:146-153`
- The public coverage contract exposes `dataQualitySnapshots` as a bare integer and does not add any provenance label for global-only versus scope-proven coverage. `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts:40-49`
- The frontend page renders coverage cards for market, sector, country, smart money, and latest date, but it does not show any data-quality coverage card or scope label. `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx:99-105`
- The lookup panel shows `dataStatus` and `gaps[]`, but that still does not tell the user whether the data-quality slice is global-only, instrument-scoped, or unavailable. `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts:155-173`
- Signal Calibration Engine depends on historical-context snapshots for regime and adjustment evidence, so misleading coverage scope weakens downstream trust rather than staying local to this module. `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md:98-110`
- `CF-W1-HCTX-02` already captures the same trust gap in requirement form, which is useful because the backlog is already pointing at the correct slice. `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-requirement.md:11-20`

## User-Value Gap

- The module can persist and retrieve historical context, but it still does not make the scope of the data-quality coverage number explicit.
- A trader or researcher can see the history page and assume completeness without knowing whether the count is only global instrument coverage.
- That weakens confidence in historical context before the data is reused for calibration, review, or other trust-sensitive workflows.

## Blocker Classification

- Product/requirements gap, not a code blocker.
- No schema, route, provider, or shared-file blocker was discovered in this audit scope.
- The gap is already represented by `CF-W1-HCTX-02`; the remaining work is routing and bounded implementation planning, not new requirement invention.

## Candidate Requirement Ideas For Team 02 / Team 00

- Keep `CF-W1-HCTX-02` as the next historical-context trust candidate.
- Add an explicit coverage-scope label for `dataQualitySnapshots`: `global-only`, `scope-proven`, or `unavailable`.
- Surface the data-quality coverage count in the UI with warning text when the count is only global coverage.
- Preserve the raw count for backward compatibility, but stop presenting it as if it were scope-proven completeness.
- Route the slice to Team 03 for contract prep and Team 04 for QA planning after the higher-priority market-data queue items.

## Audit Result

This is a real trust gap, but it is already known and bounded. No new requirement file was created because `CF-W1-HCTX-02` already covers the needed next step.
